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
      const avg = Math.round(votes.reduce((sum, v) => sum + v.level, 0) / votes.length);
      await CrowdSlot.findOneAndUpdate(
        { canteenId: canteen._id, slotStart },
        { finalLevel: avg, totalVotes: votes.length },
        { upsert: true }
      );
    }
  });
}