import cron from "node-cron";
import { Canteen } from "../models/canteen.model.js";
import { CrowdVote } from "../models/crowdVote.model.js";
import { CrowdSlot } from "../models/crowdSlot.model.js";
import { getPreviousSlotStart } from "../utils/timeSlots.js";

export function startSlotRollupJob() {
  cron.schedule("0 * * * *", async () => {
    const slotStart = getPreviousSlotStart();
    const canteens = await Canteen.find({ isActive: true });
    for (const canteen of canteens) {
      const votes = await CrowdVote.find({ canteenId: canteen._id, slotStart });
      if (votes.length === 0) continue;
      const counts = { 1: 0, 2: 0, 3: 0 };
      for (const v of votes) {
        counts[v.level] = (counts[v.level] || 0) + 1;
      }
      let maxCount = 0;
      let winner = null;
      for (const level of [1, 2, 3]) {
        if (counts[level] >= maxCount && counts[level] > 0) {
          maxCount = counts[level];
          winner = level;
        }
      }
      
      await CrowdSlot.findOneAndUpdate(
        { canteenId: canteen._id, slotStart },
        { finalLevel: winner, totalVotes: votes.length },
        { upsert: true }
      );
    }
  });
}