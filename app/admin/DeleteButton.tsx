"use client";

import { useState } from "react";

export default function DeleteButton({ table, id, label }: { table: string; id: string; label: string }) {
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, id }),
      });
      if (!res.ok) throw new Error("failed");
      window.location.reload();
    } catch {
      alert("Delete failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <button
      onClick={del}
      disabled={busy}
      title={`Delete ${label}`}
      style={{ fontSize: 12, fontWeight: 600, color: busy ? "#c9a9a4" : "#b3261e", background: "transparent", border: "1px solid #e6c9c4", borderRadius: 7, padding: "4px 10px", cursor: busy ? "default" : "pointer" }}
    >
      {busy ? "…" : "Delete"}
    </button>
  );
}
