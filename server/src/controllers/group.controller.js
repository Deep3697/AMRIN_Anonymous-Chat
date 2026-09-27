import mongoose from "mongoose";
import { Membership } from "../models/membership.model.js";
import { Group } from "../models/group.model.js";

// Computes unread counts for many groups in ONE database round-trip,
// instead of the old pattern of one countDocuments() call per group.
async function getUnreadCountsByGroup(groupIds, membershipMap, userObjectId) {
  if (groupIds.length === 0) return {};

  const Message = mongoose.model("Message");
  const rows = await Message.aggregate([
    { $match: { threadId: { $in: groupIds }, senderId: { $ne: userObjectId } } },
    { $group: { _id: "$threadId", timestamps: { $push: "$createdAt" } } },
  ]);

  const result = {};
  rows.forEach((row) => {
    const groupId = row._id.toString();
    const lastReadAt = membershipMap.get(groupId)?.lastReadAt || new Date(0);
    result[groupId] = row.timestamps.filter((t) => t > lastReadAt).length;
  });
  return result;
}

export async function getMyGroups(req, res) {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user.sub);
    const isAdmin = ["god_admin", "main_admin"].includes(req.user.role);
    let groups;

    if (isAdmin) {
      // Admins see all groups across the platform
      const allGroups = await Group.find().sort({ lastMessageAt: -1, createdAt: -1 });

      const adminMemberships = await Membership.find({ userId: userObjectId });
      const membershipMap = new Map(adminMemberships.map((m) => [m.groupId.toString(), m]));

      const unreadByGroup = await getUnreadCountsByGroup(
        allGroups.map((g) => g._id),
        membershipMap,
        userObjectId
      );

      groups = allGroups.map((g) => ({
        ...g.toObject(),
        unreadCount: unreadByGroup[g._id.toString()] || 0,
      }));
    } else {
      // Auto-sync: Ensure the user is a member of ALL universal groups.
      // This catches older users who registered before a universal group was created.
      const universalGroups = await Group.find({ level: "universal" });
      if (universalGroups.length > 0) {
        const membershipsToInsert = universalGroups.map((ug) => ({
          userId: userObjectId,
          groupId: ug._id,
        }));
        // ordered: false allows it to silently skip existing memberships without throwing errors
        await Membership.insertMany(membershipsToInsert, { ordered: false }).catch(() => {});
      }

      // Regular members only see groups they have membership for
      const memberships = await Membership.find({ userId: userObjectId }).populate("groupId");
      const validMemberships = memberships.filter((m) => m.groupId);
      const membershipMap = new Map(validMemberships.map((m) => [m.groupId._id.toString(), m]));

      const unreadByGroup = await getUnreadCountsByGroup(
        validMemberships.map((m) => m.groupId._id),
        membershipMap,
        userObjectId
      );

      groups = validMemberships
        .map((m) => ({
          ...m.groupId.toObject(),
          unreadCount: unreadByGroup[m.groupId._id.toString()] || 0,
        }))
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