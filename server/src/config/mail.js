import nodemailer from "nodemailer";

// ─── SMTP fallback (works on localhost where ports aren't blocked) ───────────
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_APP_PASSWORD,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// ─── Universal email sender ─────────────────────────────────────────────────
// Render blocks SMTP ports (25/465/587) → ETIMEDOUT.
// Resend uses HTTPS (port 443) → always works.
//
// If RESEND_API_KEY is set → send via Resend REST API  (production / Render)
// Otherwise              → send via Nodemailer SMTP    (localhost dev)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendEmail({ to, subject, text, html }) {
  // ── Resend HTTPS path (production) ──
  if (process.env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "AMRIN Chat <onboarding@resend.dev>",
        to: [to],
        subject,
        text,
        html: html || undefined,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Resend API error ${res.status}: ${errBody}`);
    }
    return true;
  }

  // ── Nodemailer SMTP path (localhost) ──
  return await transporter.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject,
    text,
    html: html || undefined,
  });
}
