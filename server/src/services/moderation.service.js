import { Offence } from "../models/offence.model.js";
import { User } from "../models/user.model.js";

const BLOCKED_WORDS = ["badword1", "badword2"];

export function isClean(text) {
  const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  return !BLOCKED_WORDS.some((word) => normalized.includes(word));
}

export async function isMuted(user) {
  return user.status === "muted" && user.mutedUntil && user.mutedUntil > new Date();
}

export async function recordOffence(userId, messageText) {
  await Offence.create({ userId, messageText });

  const recentCount = await Offence.countDocuments({
    userId,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });

  let muteMinutes = 0;
  if (recentCount >= 10) muteMinutes = 24 * 60;
  else if (recentCount >= 5) muteMinutes = 60;
  else if (recentCount >= 3) muteMinutes = 15;

  if (muteMinutes > 0) {
    await User.findByIdAndUpdate(userId, {
      status: "muted",
      mutedUntil: new Date(Date.now() + muteMinutes * 60 * 1000),
      $inc: { offenceCount: 1 },
    });
  } else {
    await User.findByIdAndUpdate(userId, { $inc: { offenceCount: 1 } });
  }
}