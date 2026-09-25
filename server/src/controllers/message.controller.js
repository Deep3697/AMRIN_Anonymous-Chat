import { Message } from "../models/message.model.js";

export async function getMessages(req, res) {
  try {
    const { groupId } = req.params;
    const messages = await Message.find({ threadId: groupId, threadType: "group" })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.status(200).json({ messages: messages.reverse() });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}