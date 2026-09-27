import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
    reason: { type: String, required: true, trim: true },
    // Track whether the reported user is an admin so God_Admin can filter admin-specific reports
    reportedUserRole: { type: String, enum: ["member", "chat_monitor", "main_admin", "god_admin"], default: "member" },
    status: { type: String, enum: ["pending", "reviewed"], default: "pending" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, enum: ["muted", "kicked", "dismissed"], default: null },
  },
  { timestamps: true }
);

// 1 report per user per group per day
reportSchema.index({ reportedBy: 1, groupId: 1, createdAt: 1 });

export const Report = mongoose.model("Report", reportSchema);
