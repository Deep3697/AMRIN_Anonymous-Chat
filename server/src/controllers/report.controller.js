import { Report } from "../models/report.model.js";
import { User } from "../models/user.model.js";
import { Membership } from "../models/membership.model.js";
import { writeAuditLog } from "../services/audit.service.js";

// Any authenticated user can report someone (1 per user per group per day)
// Admins (god_admin, main_admin) cannot use the report feature
export async function createReport(req, res) {
  try {
    const { reportedUser, groupId, reason } = req.body;
    if (!reportedUser || !groupId || !reason?.trim()) {
      return res.status(400).json({ error: "reportedUser, groupId, and reason are required" });
    }

    // Admins do not need to report
    if (["god_admin", "main_admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Admins cannot submit reports. Use moderation tools directly." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await Report.findOne({
      reportedBy: req.user.sub,
      groupId,
      createdAt: { $gte: today },
    });
    if (existing) {
      return res.status(429).json({ error: "You can only submit 1 report per group per day" });
    }

    // Look up the reported user's role so we can classify the report
    const targetUser = await User.findById(reportedUser).select("role");
    const reportedUserRole = targetUser?.role || "member";

    const report = await Report.create({
      reportedBy: req.user.sub,
      reportedUser,
      groupId,
      reason: reason.trim(),
      reportedUserRole,
    });
    return res.status(201).json({ report });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// Admin-only: list all pending reports
// Supports ?filter=admin to show only admin reports (god_admin exclusive)
// Supports ?filter=user to show only user/member reports
export async function listReports(req, res) {
  try {
    const { filter } = req.query;
    const query = { status: "pending" };

    if (filter === "admin") {
      // Only god_admin can view admin reports
      if (req.user.role !== "god_admin") {
        return res.status(403).json({ error: "Only God Admin can view admin reports" });
      }
      query.reportedUserRole = { $in: ["main_admin", "god_admin"] };
    } else if (filter === "user") {
      query.reportedUserRole = { $in: ["member", "chat_monitor"] };
    }

    const reports = await Report.find(query)
      .populate("reportedBy", "anonymousName")
      .populate("reportedUser", "anonymousName role")
      .populate("groupId", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ reports });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// Admin-only: review a report (mute / kick / dismiss)
export async function reviewReport(req, res) {
  try {
    const { reportId, action, muteDuration } = req.body;
    const report = await Report.findById(reportId);
    if (!report || report.status !== "pending") {
      return res.status(404).json({ error: "Report not found or already reviewed" });
    }

    // Only god_admin can review reports against admins
    if (["main_admin", "god_admin"].includes(report.reportedUserRole) && req.user.role !== "god_admin") {
      return res.status(403).json({ error: "Only God Admin can review admin reports" });
    }

    report.status = "reviewed";
    report.reviewedBy = req.user.sub;
    report.action = action;
    await report.save();

    if (action === "muted") {
      const minutes = muteDuration || 60;
      await User.findByIdAndUpdate(report.reportedUser, {
        status: "muted",
        mutedUntil: new Date(Date.now() + minutes * 60 * 1000),
      });
    } else if (action === "kicked") {
      await Membership.deleteOne({ userId: report.reportedUser, groupId: report.groupId });
    } else if (action === "demoted_temp") {
      const minutes = muteDuration || 60;
      const u = await User.findById(report.reportedUser);
      if (u) {
        u.suspendedRole = u.role;
        u.role = "member";
        u.roleSuspendedUntil = new Date(Date.now() + minutes * 60 * 1000);
        await u.save();
      }
    } else if (action === "demoted_perm") {
      const u = await User.findById(report.reportedUser);
      if (u) {
        u.suspendedRole = null;
        u.roleSuspendedUntil = null;
        u.role = "member";
        await u.save();
      }
    }
    // "dismissed" → no action on user

    await writeAuditLog(req.user.sub, `report:${action}`, "Report", report._id, {
      reportedUser: report.reportedUser,
    });
    return res.status(200).json({ report });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}
