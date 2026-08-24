const FROM = "HomeTutor AI <hello@hometutorai.io>";

// Send a transactional email via Resend. Fire-and-forget friendly: never throws,
// logs on failure, and no-ops (with a warning) if RESEND_API_KEY isn't set.
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!res.ok) console.error("Resend error:", res.status, await res.text());
  } catch (e) {
    console.error("Email send failed:", e);
  }
}
