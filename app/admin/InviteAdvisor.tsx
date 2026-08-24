"use client";

import { useState } from "react";

const green = "#1B3D2F";

export default function InviteAdvisor() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("advisor");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/invite-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, role, email, message }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed");
      setMsg({
        ok: true,
        text: j.emailed
          ? `${name} added as ${role}. Invitation email sent to ${email}.`
          : `${name} added as ${role}. No email given — ask them to message +972 55-935-5411 to start.`,
      });
      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
      setTimeout(() => window.location.reload(), 1600);
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  const input: React.CSSProperties = { padding: "10px 12px", fontSize: 14, border: "1.5px solid #DDD8CE", borderRadius: 9, outline: "none", boxSizing: "border-box", background: "white" };

  return (
    <form onSubmit={invite}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...input, flex: "0 1 130px", cursor: "pointer" }}>
          <option value="advisor">Advisor</option>
          <option value="teacher">Teacher</option>
          <option value="tester">Tester</option>
        </select>
        <input style={{ ...input, flex: "1 1 150px" }} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input style={{ ...input, flex: "1 1 170px" }} placeholder="Phone incl. country code (e.g. 447…)" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <input type="email" style={{ ...input, flex: "1 1 180px" }} placeholder="Email (sends the invite)" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <textarea
        placeholder="Personal message (optional) — added to the top of their invitation email"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        style={{ ...input, width: "100%", minHeight: 64, resize: "vertical", fontFamily: "inherit", marginBottom: 12 }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button type="submit" disabled={busy} style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, color: "white", background: busy ? "#7A9A8B" : green, border: "none", borderRadius: 9, cursor: busy ? "default" : "pointer" }}>
          {busy ? "Inviting…" : "Send invite"}
        </button>
        {msg && <div style={{ fontSize: 13, color: msg.ok ? green : "#b3261e" }}>{msg.text}</div>}
      </div>
    </form>
  );
}
