const membershipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  joinedAt: { type: Date, default: Date.now },
  lastReadAt: { type: Date, default: null }, // powers the unread-count badge
});

membershipSchema.index({ userId: 1, groupId: 1 }, { unique: true });

export const Membership = mongoose.model("Membership", membershipSchema);