import { Conversation } from "../models/conversation.model.js";

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