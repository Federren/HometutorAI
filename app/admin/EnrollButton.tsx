"use client";

import { useState } from "react";

const green = "#1B3D2F";

export default function EnrollButton({ consentId, enrolled, hasNumber }: { consentId: string; enrolled: boolean; hasNumber: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (enrolled) {
    return <span style={{ fontSize: 12, fontWeight: 600, color: green, background: "#E8F0EC", padding: "3px 9px", borderRadius: 999 }}>Enrolled ✓</span>;
  }
  if (!hasNumber) {
    return <span style={{ fontSize: 12, color: "#9a7415" }}>No child number</span>;
  }

  async function enroll() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed");
      window.location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <span>
      <button onClick={enroll} disabled={busy} style={{ fontSize: 12, fontWeight: 600, color: "white", background: busy ? "#7A9A8B" : green, border: "none", borderRadius: 8, padding: "5px 12px", cursor: busy ? "default" : "pointer" }}>
        {busy ? "Enrolling…" : "Enroll"}
      </button>
      {err && <div style={{ fontSize: 11, color: "#b3261e", marginTop: 3 }}>{err}</div>}
    </span>
  );
}
