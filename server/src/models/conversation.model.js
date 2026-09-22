const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessageAt: { type: Date, default: null },
    lastMessageSnippet: { type: String, default: null },
    lastReadBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        lastReadAt: { type: Date, default: null },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);