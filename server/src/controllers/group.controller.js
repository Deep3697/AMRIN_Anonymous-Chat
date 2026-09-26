import { Membership } from "../models/membership.model.js";

export async function getMyGroups(req, res) {
  try {
    const memberships = await Membership.find({ userId: req.user.sub }).populate("groupId");
    const groups = memberships
      .map((m) => m.groupId)
      .filter(Boolean)
      .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
    return res.status(200).json({ groups });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}