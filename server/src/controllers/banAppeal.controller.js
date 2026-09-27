import { BanAppeal } from "../models/banAppeal.model.js";
import { Ban } from "../models/ban.model.js";
import { User } from "../models/user.model.js";

export async function submitAppeal(req, res) {
  try {
    const userId = req.user.sub;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "Please provide a reason for your appeal" });
    }

    // Check if user is actually banned
    const user = await User.findById(userId);
    if (!user || user.status !== "banned") {
      return res.status(400).json({ error: "You are not currently banned" });
    }

    // Check if user already has a pending appeal
    const existing = await BanAppeal.findOne({ userId, status: "pending" });
    if (existing) {
      return res.status(409).json({ error: "You already have a pending appeal" });
    }

    const appeal = await BanAppeal.create({ userId, reason: reason.trim() });
    return res.status(201).json({ appeal, message: "Appeal submitted to God Admin" });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function listAppeals(req, res) {
  try {
    // Only god_admin can view appeals
    const appeals = await BanAppeal.find({ status: "pending" })
      .populate("userId", "anonymousName role")
      .sort({ createdAt: -1 });
    return res.status(200).json({ appeals });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function reviewAppeal(req, res) {
  try {
    const { appealId } = req.params;
    const { decision, reviewNote } = req.body; // decision: "approved" | "rejected"

    const appeal = await BanAppeal.findById(appealId);
    if (!appeal || appeal.status !== "pending") {
      return res.status(404).json({ error: "Appeal not found or already reviewed" });
    }

    appeal.status = decision;
    appeal.reviewedBy = req.user.sub;
    appeal.reviewedAt = new Date();
    appeal.reviewNote = reviewNote || "";
    await appeal.save();

    // If approved, revoke the ban
    if (decision === "approved") {
      const activeBan = await Ban.findOne({ userId: appeal.userId, isActive: true });
      if (activeBan) {
        activeBan.isActive = false;
        activeBan.revokedAt = new Date();
        activeBan.revokedBy = req.user.sub;
        await activeBan.save();
      }

      await User.findByIdAndUpdate(appeal.userId, {
        status: "active",
        bannedUntil: null,
      });
    }

    return res.status(200).json({ appeal, message: `Appeal ${decision}` });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function getMyAppealStatus(req, res) {
  try {
    const appeal = await BanAppeal.findOne({ userId: req.user.sub })
      .sort({ createdAt: -1 });
    return res.status(200).json({ appeal });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}
