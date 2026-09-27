import mongoose from "mongoose";

const banSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, default: "" },
    duration: { type: String, required: true }, // "1d", "3d", "7d", "1m", "3m", "permanent"
    expiresAt: { type: Date, default: null }, // null = permanent
    revokedAt: { type: Date, default: null },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

banSchema.index({ userId: 1, isActive: 1 });

export const Ban = mongoose.model("Ban", banSchema);
