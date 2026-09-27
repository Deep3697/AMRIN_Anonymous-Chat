import mongoose from "mongoose";

const helpThreadSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    messages: [
      {
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: String,
        isAdmin: Boolean,
        createdAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  { timestamps: true }
);

helpThreadSchema.index({ status: 1 });

export const HelpThread = mongoose.model("HelpThread", helpThreadSchema);