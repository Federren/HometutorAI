"use client";

import { useState } from "react";

const green = "#1B3D2F";
const border = "#DDD8CE";

const blank = { name: "", phone: "", age: "", grade: "", stream: "", subjects: "", language: "", tone: "" };

export default function AddStudent() {
  const [f, setF] = useState({ ...blank });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function set(k: keyof typeof f, v: string) { setF({ ...f, [k]: v }); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/add-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed");
      setMsg({ ok: true, text: `${f.name} added. Ask them to message +972 55-935-5411 to start. Live within ~5 min.` });
      setF({ ...blank });
      setTimeout(() => window.location.reload(), 1800);
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  const input: React.CSSProperties = { padding: "9px 11px", fontSize: 14, border: `1.5px solid ${border}`, borderRadius: 9, outline: "none", boxSizing: "border-box", width: "100%" };
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#7A7168", marginBottom: 4, display: "block" };

  return (
    <form onSubmit={submit}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <div><label style={lbl}>Name *</label><input style={input} value={f.name} onChange={(e) => set("name", e.target.value)} required /></div>
        <div><label style={lbl}>Phone (with country code) *</label><input style={input} value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="972…" required /></div>
        <div><label style={lbl}>Age</label><input style={input} type="number" value={f.age} onChange={(e) => set("age", e.target.value)} /></div>
        <div><label style={lbl}>Grade</label><input style={input} value={f.grade} onChange={(e) => set("grade", e.target.value)} placeholder="e.g. 8th grade" /></div>
        <div><label style={lbl}>Stream</label><input style={input} value={f.stream} onChange={(e) => set("stream", e.target.value)} placeholder="e.g. Hebrew secular" /></div>
        <div><label style={lbl}>Subjects (comma-separated)</label><input style={input} value={f.subjects} onChange={(e) => set("subjects", e.target.value)} placeholder="maths, science, English" /></div>
      </div>
      <div style={{ marginTop: 12 }}>
        <label style={lbl}>Language</label>
        <input style={input} value={f.language} onChange={(e) => set("language", e.target.value)} placeholder="Hebrew and English — match whichever the student writes in" />
      </div>
      <div style={{ marginTop: 12 }}>
        <label style={lbl}>Tone / how to tutor them (optional — auto-generated from age if left blank)</label>
        <textarea style={{ ...input, minHeight: 60, resize: "vertical", fontFamily: "inherit" }} value={f.tone} onChange={(e) => set("tone", e.target.value)} placeholder="Leave blank for an age-appropriate default, or describe how the tutor should treat this child." />
      </div>
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14 }}>
        <button type="submit" disabled={busy} style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, color: "white", background: busy ? "#7A9A8B" : green, border: "none", borderRadius: 9, cursor: busy ? "default" : "pointer" }}>
          {busy ? "Adding…" : "Add student"}
        </button>
        {msg && <div style={{ fontSize: 13, color: msg.ok ? green : "#b3261e" }}>{msg.text}</div>}
      </div>
    </form>
  );
}
