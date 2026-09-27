import mongoose from "mongoose";

const crowdVoteSchema = new mongoose.Schema({
  canteenId: { type: mongoose.Schema.Types.ObjectId, ref: "Canteen", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  slotStart: { type: Date, required: true },
  level: { type: Number, enum: [1, 2, 3], required: true },
});

crowdVoteSchema.index({ canteenId: 1, userId: 1, slotStart: 1 }, { unique: true });

export const CrowdVote = mongoose.model("CrowdVote", crowdVoteSchema);