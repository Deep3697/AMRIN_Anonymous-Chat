import mongoose from "mongoose";

const crowdSlotSchema = new mongoose.Schema({
  canteenId: { type: mongoose.Schema.Types.ObjectId, ref: "Canteen", required: true },
  slotStart: { type: Date, required: true },
  finalLevel: { type: Number, enum: [1, 2, 3] },
  totalVotes: { type: Number, default: 0 },
});

crowdSlotSchema.index({ canteenId: 1, slotStart: 1 }, { unique: true });

export const CrowdSlot = mongoose.model("CrowdSlot", crowdSlotSchema);