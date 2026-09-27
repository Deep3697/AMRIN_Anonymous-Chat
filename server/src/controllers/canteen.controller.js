import { Canteen } from "../models/canteen.model.js";
import { CrowdVote } from "../models/crowdVote.model.js";
import { CrowdSlot } from "../models/crowdSlot.model.js";
import { getCurrentSlotStart, getPreviousSlotStart } from "../utils/timeSlot.js";

function computeAverageLevel(votes) {
  if (votes.length < 3) return null;
  return Math.round(votes.reduce((sum, v) => sum + v.level, 0) / votes.length);
}

export async function listCanteens(req, res) {
  try {
    const canteens = await Canteen.find({ isActive: true });
    const currentSlot = getCurrentSlotStart();
    const previousSlot = getPreviousSlotStart();

    const results = await Promise.all(canteens.map(async (canteen) => {
      const currentVotes = await CrowdVote.find({ canteenId: canteen._id, slotStart: currentSlot });
      const previousSlotData = await CrowdSlot.findOne({ canteenId: canteen._id, slotStart: previousSlot });
      return {
        _id: canteen._id, name: canteen.name, location: canteen.location,
        currentLevel: computeAverageLevel(currentVotes),
        currentVoteCount: currentVotes.length,
        previousLevel: previousSlotData?.finalLevel || null,
      };
    }));

    return res.status(200).json({ canteens: results });
  } catch {
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function submitVote(req, res) {
  try {
    const { canteenId, level } = req.body;
    await CrowdVote.create({ canteenId, userId: req.user.sub, slotStart: getCurrentSlotStart(), level });
    return res.status(201).json({ message: "Vote recorded" });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "You already voted this hour" });
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function createCanteen(req, res) {
  const { name, location } = req.body;
  const canteen = await Canteen.create({ name, location });
  return res.status(201).json({ canteen });
}