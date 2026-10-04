import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { Membership } from "../models/membership.model.js";

export async function getMessages(req, res) {
  try {
    const { groupId } = req.params;
    const messages = await Message.find({ threadId: groupId })
      .sort({ createdAt: -1 })
      .limit(50);

    // Clean up seenBy array to guarantee exact count for older messages
    const cleanedMessages = messages.map(msg => {
      const obj = msg.toObject();
      const seen = new Set();
      obj.seenBy = (obj.seenBy || []).filter(s => {
        if (!s.userId) return false;
        const id = s.userId.toString();
        if (id === obj.senderId.toString()) return false;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      return obj;
    });

    // Determine which senders are no longer in the group
    const senderIds = [...new Set(messages.map(m => m.senderId.toString()))];
    const activeMemberships = await Membership.find({
      groupId,
      userId: { $in: senderIds }
    }).select("userId");

    const activeMemberIds = new Set(activeMemberships.map(m => m.userId.toString()));
    const kickedUsers = senderIds.filter(id => !activeMemberIds.has(id));

    return res.status(200).json({ messages: cleanedMessages.reverse(), kickedUsers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function getSeenBy(req, res) {
  try {
    const message = await Message.findById(req.params.messageId).populate("seenBy.userId", "anonymousName");
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Deduplicate viewers and filter out the sender themselves
    const seen = new Map();
    for (const s of message.seenBy) {
      if (!s.userId) continue;
      const id = s.userId._id.toString();
      // Exclude the sender from the "seen by" list
      if (id === message.senderId.toString()) continue;
      if (!seen.has(id)) {
        seen.set(id, s.userId);
      }
    }
    const viewers = Array.from(seen.values());
    return res.status(200).json({ viewers });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}