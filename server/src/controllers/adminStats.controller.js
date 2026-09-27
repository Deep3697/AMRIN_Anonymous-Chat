import { User } from "../models/user.model.js";
import { Group } from "../models/group.model.js";
import { Batch } from "../models/batch.model.js";
import { Message } from "../models/message.model.js";
import { HelpThread } from "../models/helpThread.model.js";
import { Report } from "../models/report.model.js";

export async function getAdminStats(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeGroups,
      batchCount,
      messagesToday,
      pendingHelp,
      pendingReports,
      mutedUsers,
      bannedUsers,
    ] = await Promise.all([
      User.countDocuments({ role: { $nin: ["god_admin", "main_admin"] } }),
      Group.countDocuments({ isActive: true }),
      Batch.countDocuments({ isActive: true }),
      Message.countDocuments({ createdAt: { $gte: today } }),
      HelpThread.countDocuments({ status: "open" }),
      Report.countDocuments({ status: "pending" }),
      User.countDocuments({ status: "muted", mutedUntil: { $gt: new Date() } }),
      User.countDocuments({ status: "banned" }),
    ]);

    // Gather real database activity from multiple collections:
    const [recentMessages, recentUsers, recentBatches, recentReports, recentHelp] = await Promise.all([
      Message.find({ type: "system" }).sort({ createdAt: -1 }).limit(6).select("text createdAt"),
      User.find({ role: { $nin: ["god_admin", "main_admin"] } }).sort({ createdAt: -1 }).limit(6).select("anonymousName createdAt batchLabel"),
      Batch.find().sort({ createdAt: -1 }).limit(4).select("label createdAt"),
      Report.find().populate("reportedUser", "anonymousName").populate("reportedBy", "anonymousName").sort({ createdAt: -1 }).limit(4),
      HelpThread.find().populate("studentId", "anonymousName").sort({ createdAt: -1 }).limit(4),
    ]);

    const activities = [];

    recentMessages.forEach((m) => {
      activities.push({
        type: "system",
        text: m.text,
        createdAt: m.createdAt,
        color: "#10b981", // green
      });
    });

    recentUsers.forEach((u) => {
      activities.push({
        type: "user",
        text: `${u.anonymousName} registered on platform${u.batchLabel ? ` (Batch ${u.batchLabel})` : ""}`,
        createdAt: u.createdAt,
        color: "#6366f1", // purple
      });
    });

    recentBatches.forEach((b) => {
      activities.push({
        type: "batch",
        text: `Batch ${b.label} was initialized`,
        createdAt: b.createdAt,
        color: "#f59e0b", // amber
      });
    });

    recentReports.forEach((r) => {
      activities.push({
        type: "report",
        text: `Report filed on ${r.reportedUser?.anonymousName || "User"}: "${r.reason}"`,
        createdAt: r.createdAt,
        color: "#ef4444", // red
      });
    });

    recentHelp.forEach((h) => {
      activities.push({
        type: "help",
        text: `Help ticket opened by ${h.studentId?.anonymousName || "Student"}`,
        createdAt: h.createdAt,
        color: "#06b6d4", // cyan
      });
    });

    // Sort descending by date
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      stats: {
        totalUsers,
        activeGroups,
        batchCount,
        messagesToday,
        pendingHelp,
        pendingReports,
        mutedUsers,
        bannedUsers,
      },
      recentActivity: activities.slice(0, 10),
    });
  } catch (err) {
    console.error("getAdminStats error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
