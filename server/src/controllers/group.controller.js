import { Membership } from "../models/membership.model.js";
import { Group } from "../models/group.model.js";

export async function getMyGroups(req, res) {
  try {
    let groups;
    if (["god_admin", "main_admin"].includes(req.user.role)) {
      // Admins see all groups across the platform
      groups = await Group.find().sort({ lastMessageAt: -1, createdAt: -1 });
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
      groups = memberships
        .map((m) => m.groupId)
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
    { lastReadAt: new Date() }
  );
  return res.status(200).json({ message: "Marked read" });
}