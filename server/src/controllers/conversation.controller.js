import mongoose from "mongoose";
import { Conversation } from "../models/conversation.model.js";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";

export async function startConversation(req, res) {
  try {
    const { otherUserId } = req.body;
    const me = req.user.sub;

    let convo = await Conversation.findOne({ participants: { $all: [me, otherUserId], $size: 2 } });
    if (!convo) {
      convo = await Conversation.create({ participants: [me, otherUserId] });
    }
    return res.status(200).json({ conversation: convo });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function getMyConversations(req, res) {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user.sub);
    const convos = await Conversation.find({ participants: userObjectId })
      .populate("participants", "anonymousName")
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    const convosWithUnread = await Promise.all(
      convos.map(async (c) => {
        const lastReadEntry = c.lastReadBy?.find(
          (lr) => String(lr.userId) === String(req.user.sub)
        );
        const lastReadAt = lastReadEntry ? lastReadEntry.lastReadAt : new Date(0);

        const unreadCount = await Message.countDocuments({
          threadId: c._id,
          createdAt: { $gt: lastReadAt },
          senderId: { $ne: userObjectId },
        });

        return {
          ...c.toObject(),
          unreadCount,
        };
      })
    );

    return res.status(200).json({ conversations: convosWithUnread });
  } catch (err) {
    console.error("getMyConversations error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function markConversationRead(req, res) {
  try {
    const { convoId } = req.params;
    const userId = req.user.sub;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();

    const convo = await Conversation.findById(convoId);
    if (!convo) return res.status(404).json({ error: "Conversation not found" });

    const idx = (convo.lastReadBy || []).findIndex((lr) => String(lr.userId) === String(userId));
    if (idx !== -1) {
      convo.lastReadBy[idx].lastReadAt = now;
    } else {
      if (!convo.lastReadBy) convo.lastReadBy = [];
      convo.lastReadBy.push({ userId: userObjectId, lastReadAt: now });
    }
    await convo.save();

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("markConversationRead error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// Search users by anonymous name for starting a DM
export async function searchUsers(req, res) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(200).json({ users: [] });
    }
    const users = await User.find({
      anonymousName: { $regex: q.trim(), $options: "i" },
      _id: { $ne: req.user.sub }, // exclude self
    })
      .select("_id anonymousName")
      .limit(15);
    return res.status(200).json({ users });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}