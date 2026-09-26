import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    // "Universal-Casual", "2024-Casual", "2024-MIT-Doubt-Box", "2024-MIT-BCE-Casual", "2024-MIT-BCE-A"
    type: {
      type: String,
      enum: ["doubt", "opportunity", "promotion", "casual", "division", "help"],
      required: true,
    },
    // Hierarchy scope fields — null means "not scoped to that level"
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", default: null },
    institute: { type: String, default: null },
    branch: { type: String, default: null },
    division: { type: String, default: null },

    // Level tag for easy querying: "universal", "batch", "institute", "branch", "division"
    level: {
      type: String,
      enum: ["universal", "batch", "institute", "branch", "division"],
      required: true,
    },

    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
    lastMessageAt: { type: Date, default: null },
    lastMessageSnippet: { type: String, default: null },
  },
  { timestamps: true }
);

export const Group = mongoose.model("Group", groupSchema);