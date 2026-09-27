import mongoose from "mongoose";

const banAppealSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: "" },
  },
  { timestamps: true }
);

banAppealSchema.index({ userId: 1, status: 1 });

export const BanAppeal = mongoose.model("BanAppeal", banAppealSchema);
