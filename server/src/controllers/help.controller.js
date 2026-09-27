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
  thread.status = "open"; // Reopen if user sends another message
  await thread.save();
  return res.status(200).json({ thread });
}

export async function getMyHelpThread(req, res) {
  const thread = await HelpThread.findOne({ studentId: req.user.sub });
  return res.status(200).json({ thread });
}

export async function getAllHelpThreads(req, res) {
  try {
    const threads = await HelpThread.find({ status: "open" }).populate("studentId", "anonymousName email").sort({ updatedAt: -1 });
    return res.status(200).json({ threads });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function replyHelpThread(req, res) {
  try {
    const { threadId } = req.params;
    const { text } = req.body;
    const thread = await HelpThread.findById(threadId);
    if (!thread) return res.status(404).json({ error: "Not found" });
    thread.messages.push({ senderId: req.user.sub, text, isAdmin: true });
    await thread.save();
    return res.status(200).json({ thread });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function resolveHelpThread(req, res) {
  try {
    const { threadId } = req.params;
    const thread = await HelpThread.findByIdAndUpdate(threadId, { status: "closed" }, { new: true });
    return res.status(200).json({ thread });
  } catch (err) {
    return res.status(500).json({ error: "Something went wrong" });
  }
}