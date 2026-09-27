import { User } from "../models/user.model.js";

export async function listMutedUsers(req, res) {
  try {
    const mutedUsers = await User.find({
      status: "muted",
      mutedUntil: { $gt: new Date() },
    })
      .select("_id anonymousName role mutedUntil offenceCount")
      .sort({ mutedUntil: -1 });

    return res.status(200).json({ users: mutedUsers });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function unmuteUser(req, res) {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.status !== "muted") return res.status(400).json({ error: "User is not muted" });

    user.status = "active";
    user.mutedUntil = null;
    await user.save();

    return res.status(200).json({ message: "User unmuted" });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}
