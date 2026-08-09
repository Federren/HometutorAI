"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Login failed");
      }
      window.location.href = "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF8F5", fontFamily: "system-ui, sans-serif" }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 340, padding: 32, background: "white", border: "1px solid #E4DED3", borderRadius: 16, boxShadow: "0 8px 30px rgba(0,0,0,0.05)" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1B3D2F", marginBottom: 4 }}>HomeTutor AI</div>
        <div style={{ fontSize: 13, color: "#7A7168", marginBottom: 20 }}>Admin sign-in</div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          style={{ width: "100%", padding: "12px 14px", fontSize: 15, border: "1.5px solid #DDD8CE", borderRadius: 10, outline: "none", boxSizing: "border-box" }}
        />
        {error && <div style={{ color: "#b3261e", fontSize: 13, marginTop: 10 }}>{error}</div>}
        <button
          type="submit"
          disabled={busy}
          style={{ width: "100%", marginTop: 16, padding: "12px", fontSize: 15, fontWeight: 600, color: "white", background: busy ? "#7A9A8B" : "#1B3D2F", border: "none", borderRadius: 10, cursor: busy ? "default" : "pointer" }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
