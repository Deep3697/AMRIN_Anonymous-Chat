import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // "24BCE-Casual", "24BCE-Div-C"
    type: {
      type: String,
      enum: ["doubt", "opportunity", "promotion", "casual", "division", "help"],
      required: true,
    },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", default: null }, // null = the universal group
    division: { type: String, default: null }, // set only for division-type groups
    isDefault: { type: Boolean, default: false }, // true for the 4 auto-generated groups per batch
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
    lastMessageAt: { type: Date, default: null },       // powers dashboard sorting
    lastMessageSnippet: { type: String, default: null }, // powers dashboard preview
  },
  { timestamps: true }
);

export const Group = mongoose.model("Group", groupSchema);