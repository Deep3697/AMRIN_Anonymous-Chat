import bcrypt from "bcrypt";
import { Otp } from "../models/otp.model.js";
import { sendEmail } from "../config/mail.js";

export async function generateOtp(email, purpose = "register") {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  // Remove all previous OTP records for this email+purpose
  // so verifyOtp always finds the freshest code
  await Otp.deleteMany({ email: normalizedEmail, purpose });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await bcrypt.hash(code, 10);

  await Otp.create({
    email: normalizedEmail,
    codeHash,
    purpose,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  console.log(`[OTP] ${purpose} code for ${normalizedEmail}: ${code}`);

  await sendEmail({
    to: normalizedEmail,
    subject: "Your AMRIN Verification Code",
    text: `Your AMRIN verification code is: ${code}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this email.`,
  });

  return true;
}

export async function verifyOtp(email, code, purpose = "register") {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  // Strip all non-digit characters (guards against spaces, dashes, autofill formatting)
  const codeStr = String(code || "").replace(/\D/g, "");

  const record = await Otp.findOne({ email: normalizedEmail, purpose }).sort({ createdAt: -1 });

  if (!record) {
    console.warn(`[OTP] No record found for ${normalizedEmail} / ${purpose}`);
    return { valid: false, reason: "No OTP found. Please request a new code." };
  }
  if (record.expiresAt < new Date()) {
    console.warn(`[OTP] Expired for ${normalizedEmail}`);
    return { valid: false, reason: "OTP has expired. Please request a new one." };
  }
  if (record.attempts >= 5) {
    return { valid: false, reason: "Too many failed attempts. Please request a new code." };
  }

  const match = await bcrypt.compare(codeStr, record.codeHash);
  if (!match) {
    record.attempts += 1;
    await record.save();
    console.warn(`[OTP] Incorrect code for ${normalizedEmail} (attempt ${record.attempts})`);
    return { valid: false, reason: "Incorrect code. Please check and try again." };
  }

  // Clean up — delete the used OTP so it can't be replayed
  await Otp.deleteMany({ email: normalizedEmail, purpose });

  return { valid: true };
}