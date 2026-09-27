import { Block } from "../models/block.model.js";
import { User } from "../models/user.model.js";

export async function blockUser(req, res) {
  try {
    const { blockedId } = req.body;
    const me = req.user.sub;

    if (me === blockedId) {
      return res.status(400).json({ error: "You cannot block yourself" });
    }

    const target = await User.findById(blockedId);
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    await Block.findOneAndUpdate(
      { blockerId: me, blockedId },
      { blockerId: me, blockedId },
      { upsert: true }
    );

    return res.status(200).json({ message: "User blocked" });
  } catch (err) {
    if (err.code === 11000) return res.status(200).json({ message: "Already blocked" });
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function unblockUser(req, res) {
  try {
    const { userId } = req.params;
    await Block.deleteOne({ blockerId: req.user.sub, blockedId: userId });
    return res.status(200).json({ message: "User unblocked" });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function getBlockList(req, res) {
  try {
    const blocks = await Block.find({ blockerId: req.user.sub })
      .populate("blockedId", "anonymousName")
      .sort({ createdAt: -1 });
    return res.status(200).json({ blocks });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}
