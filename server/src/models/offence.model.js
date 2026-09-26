import mongoose from "mongoose";

const offenceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    messageText: { type: String },
    reason: { type: String, default: "profanity" },
  },
  { timestamps: true }
);

export const Offence = mongoose.model("Offence", offenceSchema);