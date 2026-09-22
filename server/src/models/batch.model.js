const batchSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, unique: true, uppercase: true, trim: true }, // "24BCE"
    branch: { type: String, required: true },
    institute: { type: String, required: true },
    admissionYear: { type: Number }, // informational only — never used in any calculation
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Batch = mongoose.model("Batch", batchSchema);