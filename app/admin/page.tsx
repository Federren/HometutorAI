import { createClient } from "@supabase/supabase-js";
import LogoutButton from "./LogoutButton";
import InviteAdvisor from "./InviteAdvisor";
import AddStudent from "./AddStudent";
import EnrollButton from "./EnrollButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function fmt(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const wrap: React.CSSProperties = { maxWidth: 1000, margin: "0 auto", padding: "24px 20px 80px" };
const card: React.CSSProperties = { background: "white", border: "1px solid #E4DED3", borderRadius: 14, padding: 20, marginBottom: 24 };
const h2: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: "#1B3D2F", margin: "0 0 14px" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13.5 };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", color: "#7A7168", fontWeight: 600, borderBottom: "2px solid #EDE7DC", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "9px 10px", borderBottom: "1px solid #F2EEE6", color: "#151210", verticalAlign: "top" };
const pill: React.CSSProperties = { display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999 };

export default async function AdminDashboard() {
  const [waitlistRes, profilesRes, msgsRes, consentRes] = await Promise.all([
    supabase.from("waitlist").select("name,email,language,source,created_at").order("created_at", { ascending: false }),
    supabase.from("profiles").select("name,phone_number,age,grade,active,role").order("name"),
    supabase.from("messages").select("child_name,created_at"),
    supabase.from("parental_consent").select("id,child_name,child_age,child_grade,child_whatsapp,parent_name,parent_phone,parent_email,language,signed_name,signed_at,enrolled_at").order("signed_at", { ascending: false }),
  ]);

  const waitlist = waitlistRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const consents = consentRes.error ? null : consentRes.data ?? [];

  // Aggregate activity per student from the message log.
  const activity = new Map<string, { count: number; last: string }>();
  for (const m of msgsRes.data ?? []) {
    const a = activity.get(m.child_name) ?? { count: 0, last: "" };
    a.count += 1;
    if ((m.created_at ?? "") > a.last) a.last = m.created_at ?? "";
    activity.set(m.child_name, a);
  }

  // Safety flags — the table may not exist yet; degrade gracefully.
  const sf = await supabase
    .from("safety_flags")
    .select("child_name,categories,content,created_at,reviewed")
    .order("created_at", { ascending: false })
    .limit(50);
  const flags = sf.error ? null : sf.data ?? [];

  return (
    <main style={{ minHeight: "100vh", background: "#FAF8F5", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "white", borderBottom: "1px solid #E4DED3" }}>
        <div style={{ ...wrap, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1B3D2F" }}>HomeTutor AI · Admin</div>
          <LogoutButton />
        </div>
      </div>

      <div style={wrap}>
        {/* Summary */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { label: "Waitlist signups", value: waitlist.length },
            { label: "Consents signed", value: consents ? consents.length : "—" },
            { label: "Students", value: profiles.filter((p) => p.active).length },
            { label: "Safety flags", value: flags ? flags.length : "—" },
          ].map((s) => (
            <div key={s.label} style={{ ...card, flex: "1 1 160px", marginBottom: 0, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1B3D2F" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#7A7168" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add a student */}
        <section style={card}>
          <h2 style={h2}>Add a student</h2>
          <p style={{ fontSize: 13, color: "#7A7168", margin: "0 0 14px" }}>
            Creates a student profile. Onboard only after parental consent is signed. Live within ~5 minutes.
          </p>
          <AddStudent />
        </section>

        {/* Invite an advisor / teacher / tester */}
        <section style={card}>
          <h2 style={h2}>Invite an advisor, teacher, or tester</h2>
          <p style={{ fontSize: 13, color: "#7A7168", margin: "0 0 12px" }}>
            Same experience for all three (student view, can peek behind the curtain) — teachers also get an educator-focused nudge. Sends a WhatsApp invite.
          </p>
          <InviteAdvisor />
        </section>

        {/* Waitlist */}
        <section style={card}>
          <h2 style={h2}>Waitlist signups</h2>
          {waitlist.length === 0 ? (
            <div style={{ fontSize: 13, color: "#7A7168" }}>No signups yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead><tr><th style={th}>Name</th><th style={th}>Email</th><th style={th}>Lang</th><th style={th}>Signed up</th></tr></thead>
                <tbody>
                  {waitlist.map((w, i) => (
                    <tr key={i}>
                      <td style={td}>{w.name || <span style={{ color: "#B7A99A" }}>—</span>}</td>
                      <td style={td}>{w.email}</td>
                      <td style={td}>{(w.language || "en").toUpperCase()}</td>
                      <td style={td}>{fmt(w.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Consent submissions */}
        <section style={card}>
          <h2 style={h2}>Consent submissions</h2>
          {consents === null ? (
            <div style={{ fontSize: 13, color: "#9a7415", background: "#FBF3DD", padding: "10px 12px", borderRadius: 8 }}>
              The <code>parental_consent</code> table isn&apos;t set up yet.
            </div>
          ) : consents.length === 0 ? (
            <div style={{ fontSize: 13, color: "#7A7168" }}>No consents signed yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead><tr><th style={th}>Signed</th><th style={th}>Child</th><th style={th}>Age/Grade</th><th style={th}>Child WhatsApp</th><th style={th}>Parent</th><th style={th}>Parent phone</th><th style={th}>Signature</th><th style={th}>Enroll</th></tr></thead>
                <tbody>
                  {consents.map((c) => (
                    <tr key={c.id as string}>
                      <td style={td}>{fmt(c.signed_at)}</td>
                      <td style={td}>{c.child_name}</td>
                      <td style={td}>{[c.child_age, c.child_grade].filter(Boolean).join(" / ") || "—"}</td>
                      <td style={td}>{c.child_whatsapp || <span style={{ color: "#B7A99A" }}>—</span>}</td>
                      <td style={td}>{c.parent_name}</td>
                      <td style={td}>{c.parent_phone}</td>
                      <td style={{ ...td, fontStyle: "italic", fontFamily: "Georgia, serif" }}>{c.signed_name || "—"}</td>
                      <td style={td}><EnrollButton consentId={c.id as string} enrolled={!!c.enrolled_at} hasNumber={!!c.child_whatsapp} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Students & activity */}
        <section style={card}>
          <h2 style={h2}>Students &amp; activity</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead><tr><th style={th}>Name</th><th style={th}>Role</th><th style={th}>Phone</th><th style={th}>Age</th><th style={th}>Grade</th><th style={th}>Messages</th><th style={th}>Last active</th><th style={th}>Status</th></tr></thead>
              <tbody>
                {profiles.map((p, i) => {
                  const a = activity.get(p.name);
                  const role = (p.role as string) || "student";
                  const roleColor = role === "teacher" ? "#6197B0" : role === "advisor" ? "#C8922A" : role === "tester" ? "#7A7168" : "#1B3D2F";
                  return (
                    <tr key={i}>
                      <td style={td}>{p.name}</td>
                      <td style={td}><span style={{ ...pill, background: "#F2EEE6", color: roleColor }}>{role}</span></td>
                      <td style={td}>{p.phone_number}</td>
                      <td style={td}>{p.age ?? "—"}</td>
                      <td style={td}>{p.grade ?? "—"}</td>
                      <td style={td}>{a?.count ?? 0}</td>
                      <td style={td}>{fmt(a?.last)}</td>
                      <td style={td}>
                        <span style={{ ...pill, background: p.active ? "#E8F0EC" : "#F2EEE6", color: p.active ? "#1B3D2F" : "#7A7168" }}>
                          {p.active ? "active" : "inactive"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Safety flags */}
        <section style={card}>
          <h2 style={h2}>Safety flags</h2>
          {flags === null ? (
            <div style={{ fontSize: 13, color: "#9a7415", background: "#FBF3DD", padding: "10px 12px", borderRadius: 8 }}>
              The <code>safety_flags</code> table isn&apos;t set up yet. Moderation runs regardless; create the table to see flags here.
            </div>
          ) : flags.length === 0 ? (
            <div style={{ fontSize: 13, color: "#7A7168" }}>No safety flags — all clear.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={table}>
                <thead><tr><th style={th}>When</th><th style={th}>Student</th><th style={th}>Categories</th><th style={th}>Message</th></tr></thead>
                <tbody>
                  {flags.map((f, i) => (
                    <tr key={i}>
                      <td style={td}>{fmt(f.created_at)}</td>
                      <td style={td}>{f.child_name}</td>
                      <td style={td}><span style={{ ...pill, background: "#FBE9E7", color: "#b3261e" }}>{f.categories}</span></td>
                      <td style={{ ...td, maxWidth: 340 }}>{f.content}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
