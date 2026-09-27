import mongoose from "mongoose";
import { Membership } from "../models/membership.model.js";
import { Group } from "../models/group.model.js";

export async function getMyGroups(req, res) {
  try {
    let groups;
    if (["god_admin", "main_admin"].includes(req.user.role)) {
      // Admins see all groups across the platform
      const allGroups = await Group.find().sort({ lastMessageAt: -1, createdAt: -1 });
      
      const adminMemberships = await Membership.find({ userId: req.user.sub });
      const membershipMap = new Map(adminMemberships.map(m => [m.groupId.toString(), m]));

      const groupsWithUnread = await Promise.all(allGroups.map(async (g) => {
        const mem = membershipMap.get(g._id.toString());
        
        const unreadCount = await mongoose.model("Message").countDocuments({
          threadId: g._id,
          createdAt: { $gt: mem?.lastReadAt || new Date(0) },
          senderId: { $ne: req.user.sub }
        });

        return {
          ...g.toObject(),
          unreadCount
        };
      }));
      
      groups = groupsWithUnread;
    } else {
      // Auto-sync: Ensure the user is a member of ALL universal groups.
      // This catches older users who registered before a universal group was created.
      const universalGroups = await Group.find({ level: "universal" });
      if (universalGroups.length > 0) {
        const membershipsToInsert = universalGroups.map(ug => ({ 
          userId: req.user.sub, 
          groupId: ug._id 
        }));
        // ordered: false allows it to silently skip existing memberships without throwing errors
        await Membership.insertMany(membershipsToInsert, { ordered: false }).catch(() => {});
      }

      // Regular members only see groups they have membership for
      const memberships = await Membership.find({ userId: req.user.sub }).populate("groupId");
      
      const groupsWithUnread = await Promise.all(memberships.map(async (m) => {
        if (!m.groupId) return null;
        
        // Count unread messages
        const unreadCount = await mongoose.model("Message").countDocuments({
          threadId: m.groupId._id,
          createdAt: { $gt: m.lastReadAt || new Date(0) },
          senderId: { $ne: req.user.sub } // optional: don't count own messages
        });

        return {
          ...m.groupId.toObject(),
          unreadCount
        };
      }));

      groups = groupsWithUnread
        .filter(Boolean)
        .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
    }
    return res.status(200).json({ groups });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function markAsRead(req, res) {
  await Membership.updateOne(
    { userId: req.user.sub, groupId: req.params.groupId },
    { lastReadAt: new Date() },
    { upsert: true }
  );
  return res.status(200).json({ message: "Marked read" });
}