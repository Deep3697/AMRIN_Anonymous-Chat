import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, unique: true, uppercase: true, trim: true }, // "2024", "2025"
    admissionYear: { type: Number }, // informational only
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Batch = mongoose.model("Batch", batchSchema);