import bcrypt from "bcrypt";
import { Otp } from "../models/otp.model.js";
import { sendEmail } from "../config/mail.js";

export async function generateOtp(email, purpose = "register") {
  // Remove all previous OTP records for this email+purpose
  // so verifyOtp always finds the freshest code
  await Otp.deleteMany({ email, purpose });

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
  // Ensure code is always a string (guards against numeric JSON parsing)
  const codeStr = String(code).trim();

  const record = await Otp.findOne({ email, purpose }).sort({ createdAt: -1 });

  if (!record) {
    console.warn(`[OTP] No record found for ${email} / ${purpose}`);
    return { valid: false, reason: "No OTP found" };
  }
  if (record.expiresAt < new Date()) {
    console.warn(`[OTP] Expired for ${email}`);
    return { valid: false, reason: "Expired" };
  }
  if (record.attempts >= 5) {
    return { valid: false, reason: "Too many attempts" };
  }

  const match = await bcrypt.compare(codeStr, record.codeHash);
  if (!match) {
    record.attempts += 1;
    await record.save();
    console.warn(`[OTP] Incorrect code for ${email} (attempt ${record.attempts})`);
    return { valid: false, reason: "Incorrect code" };
  }

  // Clean up — delete the used OTP so it can't be replayed
  await Otp.deleteMany({ email, purpose });

  return { valid: true };
}