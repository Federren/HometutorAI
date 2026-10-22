"use client";

import { useState, useEffect, useMemo } from "react";
import {
  composeHelloText,
  personalise,
  langOf,
  isRtl,
  HELLO_PRESETS,
  HELLO_LANGS,
  HELLO_MAX_RECIPIENTS,
  type HelloPreset,
  type HelloLang,
} from "@/lib/hello";

const green = "#1B3D2F";

export type HelloRecipient = {
  phone: string;
  name: string;
  role: string;
  language: string | null;
  lastInbound: string | null; // last message the person wrote
};

type Outcome = { phone: string; name: string; ok: boolean; via: string | null; error?: string };

const HOUR = 3600 * 1000;

function quietFor(lastInbound: string | null): { open: boolean; label: string } {
  if (!lastInbound) return { open: false, label: "never replied" };
  const ms = Date.now() - new Date(lastInbound).getTime();
  if (ms < HOUR) return { open: true, label: "replied just now" };
  if (ms < 24 * HOUR) return { open: true, label: `replied ${Math.round(ms / HOUR)}h ago` };
  const days = Math.round(ms / (24 * HOUR));
  return { open: false, label: `quiet ${days}d` };
}

export default function SendHello({ recipients }: { recipients: HelloRecipient[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [preset, setPreset] = useState<HelloPreset>("hello");
  const [lang, setLang] = useState<HelloLang>("en");
  const [draft, setDraft] = useState(composeHelloText("hello", "en"));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [results, setResults] = useState<Outcome[] | null>(null);

  const chosen = useMemo(
    () => recipients.filter((r) => selected.includes(r.phone)),
    [recipients, selected]
  );

  // When everyone selected shares a language, follow it — the admin can still
  // override, and an edited draft is never overwritten.
  useEffect(() => {
    if (dirty || chosen.length === 0) return;
    const langs = new Set(chosen.map((r) => langOf(r.language)));
    if (langs.size === 1) setLang([...langs][0]);
  }, [chosen, dirty]);

  useEffect(() => {
    if (!dirty) setDraft(composeHelloText(preset, lang));
  }, [preset, lang, dirty]);

  function toggle(phone: string) {
    setResults(null);
    setMsg(null);
    setSelected((s) => (s.includes(phone) ? s.filter((p) => p !== phone) : [...s, phone]));
  }

  const quietOnes = recipients.filter((r) => !quietFor(r.lastInbound).open);
  const mismatched = chosen.filter((r) => langOf(r.language) !== lang);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!selected.length) {
      setMsg({ ok: false, text: "Pick at least one person." });
      return;
    }
    setBusy(true);
    setMsg(null);
    setResults(null);
    try {
      const res = await fetch("/api/admin/send-hello", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones: selected, body: draft }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed");
      const out: Outcome[] = j.results ?? [];
      setResults(out);
      const ok = out.filter((r) => r.ok).length;
      setMsg({
        ok: ok > 0,
        text:
          ok === out.length
            ? `Sent to ${ok} ${ok === 1 ? "person" : "people"}.`
            : ok === 0
            ? "Nothing was delivered — see below."
            : `Sent to ${ok} of ${out.length} — see below.`,
      });
      if (ok > 0) setSelected([]);
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  const input: React.CSSProperties = { padding: "10px 12px", fontSize: 14, border: "1.5px solid #DDD8CE", borderRadius: 9, outline: "none", boxSizing: "border-box", background: "white" };
  const pill: React.CSSProperties = { display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 999 };

  const preview = chosen.length ? personalise(draft, chosen[0].name) : null;

  return (
    <form onSubmit={send}>
      {/* Who */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <label style={{ fontSize: 12.5, color: "#6b6459" }}>
          Who to greet {selected.length > 0 && <span style={{ color: green, fontWeight: 600 }}>· {selected.length} selected</span>}
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          {quietOnes.length > 0 && (
            <button type="button" onClick={() => { setSelected(quietOnes.slice(0, HELLO_MAX_RECIPIENTS).map((r) => r.phone)); setResults(null); }}
              style={{ fontSize: 12, color: green, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
              Select the {quietOnes.length} quiet
            </button>
          )}
          {selected.length > 0 && (
            <button type="button" onClick={() => { setSelected([]); setResults(null); }}
              style={{ fontSize: 12, color: "#7A7168", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div style={{ border: "1px solid #EDE7DC", borderRadius: 10, maxHeight: 230, overflowY: "auto", marginBottom: 14 }}>
        {recipients.length === 0 ? (
          <div style={{ fontSize: 13, color: "#7A7168", padding: 12 }}>No active students yet.</div>
        ) : (
          recipients.map((r, i) => {
            const w = quietFor(r.lastInbound);
            const on = selected.includes(r.phone);
            const outcome = results?.find((x) => x.phone === r.phone);
            return (
              <label key={r.phone} htmlFor={`hello-${r.phone}`}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", background: on ? "#F4F8F6" : i % 2 ? "#FBFAF7" : "white", borderTop: i ? "1px solid #F2EEE6" : "none" }}>
                <input id={`hello-${r.phone}`} type="checkbox" checked={on} onChange={() => toggle(r.phone)} style={{ cursor: "pointer", accentColor: green }} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#151210", minWidth: 90 }}>{r.name}</span>
                {r.role !== "student" && <span style={{ ...pill, background: "#F2EEE6", color: "#7A7168" }}>{r.role}</span>}
                <span style={{ ...pill, background: w.open ? "#E8F0EC" : "#FBF3DD", color: w.open ? green : "#9a7415" }}>{w.label}</span>
                <span style={{ fontSize: 12, color: "#B7A99A" }}>{HELLO_LANGS.find((l) => l.id === langOf(r.language))?.label}</span>
                {outcome && (
                  <span style={{ marginLeft: "auto", fontSize: 12, color: outcome.ok ? green : "#b3261e", textAlign: "right", maxWidth: 320 }}>
                    {outcome.ok ? (outcome.via === "template" ? "✓ sent (template)" : "✓ sent") : `✗ ${outcome.error}`}
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>

      {/* What */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <select value={preset} onChange={(e) => { setPreset(e.target.value as HelloPreset); setDirty(false); }} style={{ ...input, flex: "0 1 170px", cursor: "pointer" }}>
          {HELLO_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select value={lang} onChange={(e) => { setLang(e.target.value as HelloLang); setDirty(false); }} style={{ ...input, flex: "0 1 120px", cursor: "pointer" }}>
          {HELLO_LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <label style={{ fontSize: 12.5, color: "#6b6459" }}>
          Message — edit before sending. <code style={{ background: "#F2EEE6", padding: "1px 4px", borderRadius: 4 }}>{"{name}"}</code> becomes their first name.
        </label>
        {dirty && (
          <button type="button" onClick={() => { setDraft(composeHelloText(preset, lang)); setDirty(false); }}
            style={{ fontSize: 12, color: green, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
            Reset to template
          </button>
        )}
      </div>
      <textarea
        value={draft}
        dir={isRtl(lang) ? "rtl" : "ltr"}
        onChange={(e) => { setDraft(e.target.value); setDirty(true); }}
        style={{ ...input, width: "100%", minHeight: 120, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5, marginBottom: 10 }}
      />

      {mismatched.length > 0 && (
        <div style={{ fontSize: 12.5, color: "#9a7415", background: "#FBF3DD", padding: "8px 10px", borderRadius: 8, marginBottom: 10 }}>
          Writing in {HELLO_LANGS.find((l) => l.id === lang)?.label}, but {mismatched.map((r) => r.name).join(", ")}{" "}
          {mismatched.length === 1 ? "is" : "are"} set to another language.
        </div>
      )}

      {preview && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "#9a938a", marginBottom: 4 }}>
            {chosen[0].name} receives{chosen.length > 1 ? ` (and ${chosen.length - 1} more, each with their own name)` : ""}:
          </div>
          <div dir={isRtl(lang) ? "rtl" : "ltr"}
            style={{ background: "#E8F0EC", border: "1px solid #D5E3DB", borderRadius: "12px 12px 12px 3px", padding: "9px 12px", fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap", maxWidth: 420, color: "#151210" }}>
            {preview}
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <button type="submit" disabled={busy || !selected.length}
          style={{ padding: "10px 20px", fontSize: 14, fontWeight: 600, color: "white", background: busy || !selected.length ? "#7A9A8B" : green, border: "none", borderRadius: 9, cursor: busy || !selected.length ? "default" : "pointer" }}>
          {busy ? "Sending…" : selected.length > 1 ? `Send to ${selected.length}` : "Send hello"}
        </button>
        {msg && <div style={{ fontSize: 13, color: msg.ok ? green : "#b3261e" }}>{msg.text}</div>}
      </div>
    </form>
  );
}
