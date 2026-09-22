import bcrypt from "bcrypt";
import { Otp } from "../models/otp.model.js";

export async function generateOtp(email, purpose = "register") {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await bcrypt.hash(code, 10);

  await Otp.create({
    email,
    codeHash,
    purpose,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  console.log(`[DEV] OTP for ${email}: ${code}`); // replaced with real email in Phase 7
  return true;
}

export async function verifyOtp(email, code, purpose = "register") {
  const record = await Otp.findOne({ email, purpose }).sort({ createdAt: -1 });
  if (!record) return { valid: false, reason: "No OTP found" };
  if (record.expiresAt < new Date()) return { valid: false, reason: "Expired" };
  if (record.attempts >= 5) return { valid: false, reason: "Too many attempts" };

  const match = await bcrypt.compare(code, record.codeHash);
  if (!match) {
    record.attempts += 1;
    await record.save();
    return { valid: false, reason: "Incorrect code" };
  }

  return { valid: true };
}