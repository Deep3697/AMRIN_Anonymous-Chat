// ─── Brevo Email Service ────────────────────────────────────────────────────
// Uses Brevo HTTPS REST API (port 443).
// Works on both localhost and cloud platforms like Render without port blocking.
// Does NOT require a custom domain.
// ─────────────────────────────────────────────────────────────────────────────
export async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.error("[Email Error] BREVO_API_KEY is not set in environment variables");
    throw new Error("BREVO_API_KEY is not set in environment variables");
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.MAIL_USER || "amrin.chat.reg@gmail.com";
  const senderName = process.env.BREVO_SENDER_NAME || "AMRIN Chat";

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html || `<div style="font-family: sans-serif; font-size: 15px; color: #111;"><p>${(text || "").replace(/\n/g, "<br>")}</p></div>`,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Brevo API error ${res.status}: ${errBody}`);
  }

  console.log(`[Email] Successfully sent OTP via Brevo to ${to}`);
  return true;
}
