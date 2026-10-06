import bcrypt from "bcrypt";
import { Otp } from "../models/otp.model.js";
import { sendEmail } from "../config/mail.js";

export async function generateOtp(email, purpose = "register") {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await bcrypt.hash(code, 10);

  await Otp.create({
    email,
    codeHash,
    purpose,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  console.log(`[OTP] ${purpose} code for ${email}: ${code}`);

  await sendEmail({
    to: email,
    subject: "Your AMRIN Verification Code",
    text: `Your AMRIN verification code is: ${code}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this email.`,
  });

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