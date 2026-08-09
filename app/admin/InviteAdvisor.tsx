"use client";

import { useState } from "react";

const green = "#1B3D2F";

export default function InviteAdvisor() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
        body: JSON.stringify({ name, phone }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed");
      setMsg({
        ok: true,
        text: j.sent
          ? `${name} added as an advisor. Invite sent (may not arrive until they message the bot first).`
          : `${name} added as an advisor. Ask them to message +972 55-935-5411 to start.`,
      });
      setName("");
      setPhone("");
      // Refresh the dashboard so the new advisor shows in the students list.
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  const input: React.CSSProperties = { padding: "10px 12px", fontSize: 14, border: "1.5px solid #DDD8CE", borderRadius: 9, outline: "none", boxSizing: "border-box" };

  return (
    <form onSubmit={invite} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <input style={{ ...input, flex: "1 1 160px" }} placeholder="Advisor name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input style={{ ...input, flex: "1 1 160px" }} placeholder="Phone incl. country code (e.g. 447…)" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      <button type="submit" disabled={busy} style={{ padding: "10px 18px", fontSize: 14, fontWeight: 600, color: "white", background: busy ? "#7A9A8B" : green, border: "none", borderRadius: 9, cursor: busy ? "default" : "pointer" }}>
        {busy ? "Inviting…" : "Invite advisor"}
      </button>
      {msg && <div style={{ flexBasis: "100%", fontSize: 13, color: msg.ok ? green : "#b3261e" }}>{msg.text}</div>}
    </form>
  );
}
