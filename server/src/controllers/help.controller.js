import { HelpThread } from "../models/helpThread.model.js";

export async function sendHelpMessage(req, res) {
  const { text } = req.body;
  const userId = req.user.sub;

  let thread = await HelpThread.findOne({ studentId: userId });
  if (!thread) thread = await HelpThread.create({ studentId: userId, messages: [] });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todaysCount = thread.messages.filter(
    (m) => !m.isAdmin && m.createdAt >= today
  ).length;

  if (todaysCount >= 3) {
    return res.status(429).json({ error: "You've reached today's limit of 3 messages" });
  }

  thread.messages.push({ senderId: userId, text, isAdmin: false });
  await thread.save();
  return res.status(200).json({ thread });
}

export async function getMyHelpThread(req, res) {
  const thread = await HelpThread.findOne({ studentId: req.user.sub });
  return res.status(200).json({ thread });
}