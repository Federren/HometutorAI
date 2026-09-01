"use client";

import { useState } from "react";

export default function DismissFlagButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);

  async function dismiss() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/review-flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) window.location.reload();
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={dismiss}
      disabled={busy}
      style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", border: "1px solid #DDD8CE", borderRadius: 8, background: "white", color: "#5c554b", cursor: busy ? "default" : "pointer" }}
    >
      {busy ? "…" : "Mark reviewed"}
    </button>
  );
}
