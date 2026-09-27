import { Conversation } from "../models/conversation.model.js";
import { User } from "../models/user.model.js";

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
    const convos = await Conversation.find({ participants: req.user.sub })
      .populate("participants", "anonymousName")
      .sort({ lastMessageAt: -1 });
    return res.status(200).json({ conversations: convos });
  } catch {
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