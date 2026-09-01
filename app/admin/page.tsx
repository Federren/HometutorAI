import { createClient } from "@supabase/supabase-js";
import LogoutButton from "./LogoutButton";
import InviteAdvisor from "./InviteAdvisor";
import AddStudent from "./AddStudent";
import EnrollButton from "./EnrollButton";
import DeleteButton from "./DeleteButton";
import DismissFlagButton from "./DismissFlagButton";

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
    supabase.from("waitlist").select("id,name,email,language,source,created_at").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,name,phone_number,age,grade,active,role").order("name"),
    supabase.from("messages").select("phone_number,role,created_at,subject_detected"),
    supabase.from("parental_consent").select("id,child_name,child_age,child_grade,child_whatsapp,parent_name,parent_phone,parent_email,language,signed_name,signed_at,enrolled_at").order("signed_at", { ascending: false }),
  ]);

  const waitlist = waitlistRes.data ?? [];
  const profiles = profilesRes.data ?? [];
  const consents = consentRes.error ? null : consentRes.data ?? [];

  // Aggregate activity per person (keyed by phone) from the message log.
  const now = Date.now();
  const WEEK = 7 * 24 * 3600 * 1000;
  type Agg = { count: number; sent: number; last: string; days: Set<string>; week: number; subjects: Map<string, number> };
  const activity = new Map<string, Agg>();
  for (const m of msgsRes.data ?? []) {
    const key = m.phone_number as string;
    if (!key) continue;
    const a = activity.get(key) ?? { count: 0, sent: 0, last: "", days: new Set<string>(), week: 0, subjects: new Map<string, number>() };
    a.count += 1;
    if (m.role === "user") a.sent += 1;
    const ts = (m.created_at as string) ?? "";
    if (ts > a.last) a.last = ts;
    if (ts) { a.days.add(ts.slice(0, 10)); if (now - new Date(ts).getTime() < WEEK) a.week += 1; }
    const subj = m.subject_detected as string | null;
    if (subj) a.subjects.set(subj, (a.subjects.get(subj) ?? 0) + 1);
    activity.set(key, a);
  }
  const topSubject = (a?: Agg): string =>
    !a || a.subjects.size === 0 ? "—" : [...a.subjects.entries()].sort((x, y) => y[1] - x[1])[0][0];
  const activeThisWeek = profiles.filter((p) => p.active && (activity.get(p.phone_number as string)?.week ?? 0) > 0).length;

  // Safety flags — the table may not exist yet; degrade gracefully.
  const sf = await supabase
    .from("safety_flags")
    .select("id,phone_number,child_name,categories,content,created_at,reviewed")
    .order("created_at", { ascending: false })
    .limit(50);
  const flags = sf.error ? null : sf.data ?? [];

  // Pull a little surrounding conversation for each flag so it can be judged in context.
  const flagCtx: Record<string, { role: string; content: string }[]> = {};
  if (flags && flags.length) {
    await Promise.all(
      flags.map(async (f) => {
        const t = new Date(f.created_at as string).getTime();
        const { data } = await supabase
          .from("messages")
          .select("role,content,created_at")
          .eq("phone_number", f.phone_number as string)
          .gte("created_at", new Date(t - 150000).toISOString())
          .lte("created_at", new Date(t + 45000).toISOString())
          .order("created_at", { ascending: true })
          .limit(12);
        flagCtx[f.id as string] = (data ?? []).map((m) => ({ role: m.role as string, content: (m.content as string) ?? "" }));
      })
    );
  }
  const flagSeverity = (categories: string) => {
    const c = (categories || "").toLowerCase();
    if (c.includes("self-harm") || c.includes("sexual") || c.includes("suicid") || c.includes("serious"))
      return { label: "high", color: "#b3261e", bg: "#FBE9E7" };
    return { label: "review", color: "#9a7415", bg: "#FBF3DD" };
  };
  const openFlags = flags ? flags.filter((f) => !f.reviewed).length : 0;

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
            { label: "Students", value: profiles.filter((p) => p.active).length },
            { label: "Active this week", value: activeThisWeek },
            { label: "Consents signed", value: consents ? consents.length : "—" },
            { label: "Safety flags (open)", value: flags ? openFlags : "—" },
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
            Same experience for all three (student view, can peek behind the curtain) — teachers also get an educator-focused nudge. Add an email and they get an invitation with how to start.
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
                <thead><tr><th style={th}>Name</th><th style={th}>Email</th><th style={th}>Lang</th><th style={th}>Signed up</th><th style={th}></th></tr></thead>
                <tbody>
                  {waitlist.map((w) => (
                    <tr key={w.id as string}>
                      <td style={td}>{w.name || <span style={{ color: "#B7A99A" }}>—</span>}</td>
                      <td style={td}>{w.email}</td>
                      <td style={td}>{(w.language || "en").toUpperCase()}</td>
                      <td style={td}>{fmt(w.created_at)}</td>
                      <td style={td}><DeleteButton table="waitlist" id={w.id as string} label={(w.email as string) || "this signup"} /></td>
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
                <thead><tr><th style={th}>Signed</th><th style={th}>Child</th><th style={th}>Age/Grade</th><th style={th}>Child WhatsApp</th><th style={th}>Parent</th><th style={th}>Parent phone</th><th style={th}>Signature</th><th style={th}>Enroll</th><th style={th}></th></tr></thead>
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
                      <td style={td}><DeleteButton table="parental_consent" id={c.id as string} label={`${c.child_name}'s consent`} /></td>
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
          <p style={{ fontSize: 12, color: "#9a938a", margin: "-6px 0 12px" }}>
            Sent = messages the student wrote · 7d = messages in the last 7 days · Active days = distinct days used · Subject = what they use it for most
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead><tr><th style={th}>Name</th><th style={th}>Role</th><th style={th}>Grade</th><th style={th}>Msgs</th><th style={th}>Sent</th><th style={th}>7d</th><th style={th}>Active days</th><th style={th}>Subject</th><th style={th}>Last active</th><th style={th}>Status</th><th style={th}></th></tr></thead>
              <tbody>
                {profiles.map((p, i) => {
                  const a = activity.get(p.phone_number as string);
                  const role = (p.role as string) || "student";
                  const roleColor = role === "teacher" ? "#6197B0" : role === "advisor" ? "#C8922A" : role === "tester" ? "#7A7168" : "#1B3D2F";
                  const recent = (a?.week ?? 0) > 0;
                  return (
                    <tr key={i}>
                      <td style={td}>{p.name}</td>
                      <td style={td}><span style={{ ...pill, background: "#F2EEE6", color: roleColor }}>{role}</span></td>
                      <td style={td}>{p.grade ?? "—"}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{a?.count ?? 0}</td>
                      <td style={td}>{a?.sent ?? 0}</td>
                      <td style={{ ...td, color: recent ? "#1B3D2F" : "#B7A99A", fontWeight: recent ? 600 : 400 }}>{a?.week ?? 0}</td>
                      <td style={td}>{a?.days.size ?? 0}</td>
                      <td style={td}>{topSubject(a)}</td>
                      <td style={td}>{fmt(a?.last)}</td>
                      <td style={td}>
                        <span style={{ ...pill, background: p.active ? "#E8F0EC" : "#F2EEE6", color: p.active ? "#1B3D2F" : "#7A7168" }}>
                          {p.active ? "active" : "inactive"}
                        </span>
                      </td>
                      <td style={td}><DeleteButton table="profiles" id={p.id as string} label={`${p.name} (${role})`} /></td>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[...flags].sort((a, b) => Number(!!a.reviewed) - Number(!!b.reviewed)).map((f, i) => {
                const sev = flagSeverity(f.categories as string);
                const ctx = flagCtx[f.id as string] ?? [];
                const done = !!f.reviewed;
                return (
                  <div key={i} style={{ border: `1px solid ${done ? "#EDE7DC" : "#F1C9C4"}`, borderRadius: 12, padding: 14, background: done ? "#FBFAF7" : "#FFF", opacity: done ? 0.72 : 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                      <span style={{ ...pill, background: done ? "#F2EEE6" : sev.bg, color: done ? "#7A7168" : sev.color }}>{done ? "reviewed" : sev.label}</span>
                      <strong style={{ fontSize: 14 }}>{f.child_name}</strong>
                      <span style={{ fontSize: 12.5, color: "#7A7168" }}>{fmt(f.created_at)}</span>
                      <span style={{ fontSize: 12.5, color: "#9a938a" }}>· {f.categories}</span>
                      <span style={{ marginLeft: "auto" }}>{!done && <DismissFlagButton id={f.id as string} />}</span>
                    </div>
                    {ctx.length > 0 ? (
                      <div style={{ background: "#FAF8F5", border: "1px solid #F2EEE6", borderRadius: 8, padding: "8px 10px", fontSize: 12.5, lineHeight: 1.55 }}>
                        {ctx.map((m, j) => {
                          const isFlagged = m.role === "user" && m.content.trim() === String(f.content).trim();
                          return (
                            <div key={j} style={{ margin: "2px 0", background: isFlagged ? "#FBE9E7" : "transparent", borderRadius: 4, padding: isFlagged ? "2px 5px" : "0 5px" }}>
                              <span style={{ color: m.role === "user" ? "#1B3D2F" : "#9a938a", fontWeight: 600 }}>{m.role === "user" ? "Student" : "Tutor"}: </span>
                              <span style={{ color: "#3a352e" }}>{m.content}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: "#3a352e" }}>&ldquo;{f.content}&rdquo;</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
