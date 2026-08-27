// Shared invite-email composition, used by the admin form (to show an editable
// preview) and the server (to send exactly what the admin sees/edits).
export type InviteRole = "advisor" | "teacher" | "tester";

const BOT_NUMBER = "+972 55-935-5411";

// The default draft the admin sees, and can edit before sending.
export function composeInviteText(role: InviteRole, name: string): string {
  const who = name.trim() || "there";
  const label = role === "teacher" ? "a teacher" : role === "tester" ? "a tester" : "an advisor";
  const teacherLine = role === "teacher"
    ? `\n\nAs a teacher, do probe how it handles a struggling student, why it withholds answers, and whether its explanations hold up — that feedback is exactly what we want.`
    : "";
  return `Hi ${who},

You've been invited to try HomeTutor AI as ${label} — it's a WhatsApp tutor that guides students to answers with questions, rather than handing them over.

To start, open WhatsApp and send a quick "hi" to ${BOT_NUMBER}. It'll greet you, and you can try it exactly as a student would. Any time, you can also ask it directly how it works.${teacherLine}

Any questions, just reply to this email.

The HomeTutor AI team`;
}

// Wrap the (possibly edited) plain-text draft in the plain, personal HTML that
// lands in Primary rather than Promotions.
export function inviteTextToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paras = text.trim().split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#222;line-height:1.6;max-width:520px">${paras}</div>`;
}

export const INVITE_SUBJECT = "An invitation to try HomeTutor AI";
