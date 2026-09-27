import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["image", "video", "audio","file"], required: true },
    url: { type: String, required: true },
    publicId: { type: String },
    caption: { type: String, trim: true },
    fileName: { type: String, default: null },
    sizeBytes: { type: Number },
    durationSeconds: { type: Number },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    threadId: { type: mongoose.Schema.Types.ObjectId, required: true }, // a Group._id or a Conversation._id
    threadType: { type: String, enum: ["group", "dm"], required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    anonymousNameSnapshot: { type: String, required: true },
    text: { type: String, trim: true }, // optional — a message can be media-only
    attachment: { type: attachmentSchema, default: null },
    type: { type: String, enum: ["user", "system", "poll"], default: "user" },
    poll: {
      question: { type: String },
      options: [{
        text: String,
        votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        _id: false,
      }],
      allowMultiple: { type: Boolean, default: false },
    },
    isDeleted: { type: Boolean, default: false },
    deletedBySnapshot: { type: String, default: null },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    seenBy: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, seenAt: { type: Date, default: Date.now }, _id: false }],
    embedding: { type: [Number], default: [] },
    meta: {
      deadline: { type: Date, default: null },
    },
  }, { timestamps: true }
);

messageSchema.index({ threadId: 1, createdAt: -1 });

export const Message = mongoose.model("Message", messageSchema);