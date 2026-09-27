import { Canteen } from "../models/canteen.model.js";
import { CrowdVote } from "../models/crowdVote.model.js";
import { CrowdSlot } from "../models/crowdSlot.model.js";
import { getCurrentSlotStart, getPreviousSlotStart } from "../utils/timeSlots.js";

function computeMajorityLevel(votes) {
  if (votes.length < 1) return null;
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
  return winner;
}

export async function listCanteens(req, res) {
  try {
    const canteens = await Canteen.find({ isActive: true });
    const currentSlot = getCurrentSlotStart();
    const previousSlot = getPreviousSlotStart();

    const results = await Promise.all(canteens.map(async (canteen) => {
      const currentVotes = await CrowdVote.find({ canteenId: canteen._id, slotStart: currentSlot });
      const previousSlotData = await CrowdSlot.findOne({ canteenId: canteen._id, slotStart: previousSlot });
      const hasVoted = currentVotes.some(v => String(v.userId) === String(req.user.sub));
      return {
        _id: canteen._id, name: canteen.name, location: canteen.location,
        currentLevel: computeMajorityLevel(currentVotes),
        currentVoteCount: currentVotes.length,
        previousLevel: previousSlotData?.finalLevel || null,
        hasVoted
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