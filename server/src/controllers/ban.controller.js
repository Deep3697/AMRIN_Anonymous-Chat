import { Ban } from "../models/ban.model.js";
import { User } from "../models/user.model.js";

// Role hierarchy: god_admin > main_admin > chat_monitor > member
const ROLE_LEVEL = { god_admin: 4, main_admin: 3, chat_monitor: 2, member: 1 };

// Duration string → milliseconds (null = permanent)
function parseDuration(d) {
  const map = {
    "1d": 1 * 24 * 60 * 60 * 1000,
    "3d": 3 * 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "1m": 30 * 24 * 60 * 60 * 1000,
    "3m": 90 * 24 * 60 * 60 * 1000,
  };
  return map[d] || null; // null = permanent
}

export async function banUser(req, res) {
  try {
    const { userId, reason, duration } = req.body;
    const adminId = req.user.sub;

    const admin = await User.findById(adminId);
    const target = await User.findById(userId);

    if (!target) return res.status(404).json({ error: "User not found" });

    // Role hierarchy check: can only ban lower roles
    const adminLevel = ROLE_LEVEL[admin.role] || 0;
    const targetLevel = ROLE_LEVEL[target.role] || 0;

    if (targetLevel >= adminLevel) {
      return res.status(403).json({ error: "You cannot ban a user with equal or higher role" });
    }

    // Check if already actively banned
    const existingBan = await Ban.findOne({ userId, isActive: true });
    if (existingBan) {
      return res.status(409).json({ error: "User is already banned" });
    }

    const ms = parseDuration(duration);
    const expiresAt = ms ? new Date(Date.now() + ms) : null;

    await Ban.create({ userId, bannedBy: adminId, reason, duration, expiresAt });

    // Update user status
    await User.findByIdAndUpdate(userId, {
      status: "banned",
      bannedUntil: expiresAt,
    });

    return res.status(200).json({ message: "User banned", expiresAt });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function revokeBan(req, res) {
  try {
    const { banId } = req.params;

    // Only god_admin can revoke bans
    if (req.user.role !== "god_admin") {
      return res.status(403).json({ error: "Only God Admin can revoke bans" });
    }

    const ban = await Ban.findById(banId);
    if (!ban || !ban.isActive) {
      return res.status(404).json({ error: "Ban not found or already revoked" });
    }

    ban.isActive = false;
    ban.revokedAt = new Date();
    ban.revokedBy = req.user.sub;
    await ban.save();

    // Restore user status
    await User.findByIdAndUpdate(ban.userId, {
      status: "active",
      bannedUntil: null,
    });

    return res.status(200).json({ message: "Ban revoked" });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function listBannedUsers(req, res) {
  try {
    const bans = await Ban.find({ isActive: true })
      .populate("userId", "anonymousName role")
      .populate("bannedBy", "anonymousName role")
      .sort({ createdAt: -1 });

    // Filter out expired bans and auto-restore them
    const activeBans = [];
    for (const ban of bans) {
      if (ban.expiresAt && ban.expiresAt <= new Date()) {
        ban.isActive = false;
        await ban.save();
        if (ban.userId) {
          await User.findByIdAndUpdate(ban.userId._id, { status: "active", bannedUntil: null });
        }
      } else {
        activeBans.push(ban);
      }
    }

    return res.status(200).json({ bans: activeBans });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function searchUsersForBan(req, res) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(200).json({ users: [] });
    }

    const admin = await User.findById(req.user.sub);
    const adminLevel = ROLE_LEVEL[admin.role] || 0;

    // Only show users with lower role level
    const lowerRoles = Object.entries(ROLE_LEVEL)
      .filter(([, level]) => level < adminLevel)
      .map(([role]) => role);

    const users = await User.find({
      anonymousName: { $regex: q.trim(), $options: "i" },
      role: { $in: lowerRoles },
      status: { $ne: "banned" },
    })
      .select("_id anonymousName role")
      .limit(15);

    return res.status(200).json({ users });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}
