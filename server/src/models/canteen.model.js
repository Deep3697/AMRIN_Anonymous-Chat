import mongoose from "mongoose";

const canteenSchema = new mongoose.Schema(
  { name: { type: String, required: true, unique: true, trim: true }, location: { type: String, trim: true }, isActive: { type: Boolean, default: true } },
  { timestamps: true }
);

export const Canteen = mongoose.model("Canteen", canteenSchema);