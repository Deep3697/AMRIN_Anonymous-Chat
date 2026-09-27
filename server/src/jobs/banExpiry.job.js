import cron from "node-cron";
import { Ban } from "../models/ban.model.js";
import { User } from "../models/user.model.js";

export function startBanExpiryJob() {
  cron.schedule("*/5 * * * *", async () => { // every 5 minutes
    const expiredBans = await Ban.find({ isActive: true, expiresAt: { $lte: new Date() } });
    for (const ban of expiredBans) {
      ban.isActive = false;
      await ban.save();
      await User.findByIdAndUpdate(ban.userId, { status: "active", bannedUntil: null });
    }
  });
}