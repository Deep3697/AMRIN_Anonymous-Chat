import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    anonymousName: { type: String, required: true, unique: true, trim: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },

    // Cohort — all null until an admin manually assigns them (see Batch/Group below)
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", default: null },
    batchLabel: { type: String, default: null }, // cached copy of Batch.label, avoids a populate for display
    branch: { type: String, default: null },
    institute: { type: String, default: null },
    division: { type: String, default: null },   // set only once the second admin step happens

    role: {
      type: String,
      enum: ["member", "chat_monitor", "main_admin", "god_admin"],
      default: "member",
    },
    suspendedRole: { type: String, default: null },
    roleSuspendedUntil: { type: Date, default: null },
    
    status: { type: String, enum: ["active", "muted", "blocked", "banned"], default: "active" },
    mutedUntil: { type: Date, default: null },
    bannedUntil: { type: Date, default: null },
    offenceCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

//It only do rehashing when only password changes not any other fields
userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
});

export const User = mongoose.model("User", userSchema);