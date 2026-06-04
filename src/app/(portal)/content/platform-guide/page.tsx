"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CanonicalEntry {
  label: string;
  prompt: string;
}

interface ExamplePrompt {
  useCase: string;
  prompt: string;
}

interface PlatformGuide {
  platform_intro: string;
  canonical_entry_prompts: CanonicalEntry[];
  feedback_prompt: string;
  example_prompts: ExamplePrompt[];
}

export default function PlatformGuidePage() {
  const [data, setData] = useState<PlatformGuide>({ platform_intro: "", canonical_entry_prompts: [], feedback_prompt: "", example_prompts: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/content/platform-guide")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/content/platform-guide", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
  }

  if (loading) return <p className="text-sm p-7" style={{ color: "var(--color-jda-text-muted)" }}>Loading…</p>;

  return (
    <div className="max-w-3xl">
      <div className="mb-5">
        <Link href="/content" className="text-xs font-semibold no-underline mb-2 inline-block"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em", color: "var(--color-jda-warm-gray)" }}>
          ← Content library
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>Platform Guide</h1>
          <button onClick={save} disabled={saving} className="text-xs px-3 py-1.5 rounded-md font-semibold"
            style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)", cursor: "pointer" }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--color-jda-warm-gray)" }}>
          Copy surfaced to practitioners via <code className="text-xs">alexandria_help</code>.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--color-jda-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Platform Introduction</label>
          <textarea value={data.platform_intro} onChange={(e) => setData({ ...data, platform_intro: e.target.value })} rows={4}
            className="text-sm px-3 py-1.5 rounded-md w-full" style={{ background: "var(--color-jda-bg-surface)", color: "var(--color-jda-cream)", border: "1px solid var(--color-jda-border)", resize: "vertical" }} />
        </div>

        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--color-jda-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Feedback Prompt</label>
          <textarea value={data.feedback_prompt} onChange={(e) => setData({ ...data, feedback_prompt: e.target.value })} rows={4}
            className="text-sm px-3 py-1.5 rounded-md w-full" style={{ background: "var(--color-jda-bg-surface)", color: "var(--color-jda-cream)", border: "1px solid var(--color-jda-border)", resize: "vertical" }} />
        </div>

        {/* Canonical Entry Prompts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold" style={{ color: "var(--color-jda-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Canonical Entry Prompts</label>
            <button onClick={() => setData({ ...data, canonical_entry_prompts: [...data.canonical_entry_prompts, { label: "", prompt: "" }] })}
              className="text-xs px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-jda-text-muted)", border: "1px dashed var(--color-jda-border)", cursor: "pointer" }}>
              + Add
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {data.canonical_entry_prompts.map((entry, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ background: "var(--color-jda-bg-surface)", border: "1px solid var(--color-jda-border)" }}>
                <div className="flex gap-2 mb-2">
                  <input type="text" placeholder="Label" value={entry.label} onChange={(e) => {
                    const updated = [...data.canonical_entry_prompts];
                    updated[i] = { ...updated[i], label: e.target.value };
                    setData({ ...data, canonical_entry_prompts: updated });
                  }} className="text-sm px-2 py-1 rounded flex-1" style={{ background: "var(--color-jda-bg)", color: "var(--color-jda-cream)", border: "1px solid var(--color-jda-border)" }} />
                  <button onClick={() => setData({ ...data, canonical_entry_prompts: data.canonical_entry_prompts.filter((_, j) => j !== i) })}
                    className="text-xs px-2" style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>×</button>
                </div>
                <textarea placeholder="Prompt" value={entry.prompt} onChange={(e) => {
                  const updated = [...data.canonical_entry_prompts];
                  updated[i] = { ...updated[i], prompt: e.target.value };
                  setData({ ...data, canonical_entry_prompts: updated });
                }} rows={2} className="text-sm px-2 py-1 rounded w-full" style={{ background: "var(--color-jda-bg)", color: "var(--color-jda-cream)", border: "1px solid var(--color-jda-border)", resize: "vertical" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Example Prompts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold" style={{ color: "var(--color-jda-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Example Prompts</label>
            <button onClick={() => setData({ ...data, example_prompts: [...data.example_prompts, { useCase: "", prompt: "" }] })}
              className="text-xs px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-jda-text-muted)", border: "1px dashed var(--color-jda-border)", cursor: "pointer" }}>
              + Add
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {data.example_prompts.map((entry, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ background: "var(--color-jda-bg-surface)", border: "1px solid var(--color-jda-border)" }}>
                <div className="flex gap-2 mb-2">
                  <input type="text" placeholder="Use Case" value={entry.useCase} onChange={(e) => {
                    const updated = [...data.example_prompts];
                    updated[i] = { ...updated[i], useCase: e.target.value };
                    setData({ ...data, example_prompts: updated });
                  }} className="text-sm px-2 py-1 rounded flex-1" style={{ background: "var(--color-jda-bg)", color: "var(--color-jda-cream)", border: "1px solid var(--color-jda-border)" }} />
                  <button onClick={() => setData({ ...data, example_prompts: data.example_prompts.filter((_, j) => j !== i) })}
                    className="text-xs px-2" style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>×</button>
                </div>
                <textarea placeholder="Prompt" value={entry.prompt} onChange={(e) => {
                  const updated = [...data.example_prompts];
                  updated[i] = { ...updated[i], prompt: e.target.value };
                  setData({ ...data, example_prompts: updated });
                }} rows={2} className="text-sm px-2 py-1 rounded w-full" style={{ background: "var(--color-jda-bg)", color: "var(--color-jda-cream)", border: "1px solid var(--color-jda-border)", resize: "vertical" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
