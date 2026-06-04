"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Practice {
  id: number;
  name: string;
}

interface NamedItem {
  name: string;
  description?: string;
  instructions?: string;
}

interface Methodology {
  id: number;
  name: string;
  slug: string;
  description: string;
  practice_id: number | null;
  practice_name: string | null;
  ai_classification: string | null;
  tools_involved: string[];
  required_inputs: NamedItem[];
  system_instructions: string;
  steps: NamedItem[];
  output_format: string;
  quality_checks: NamedItem[];
  failure_modes: NamedItem[];
  vision_of_good: string;
  tips: string;
  client_refinements: NamedItem[];
  quality_checklist: NamedItem[];
  baseline_production_time: string | null;
  ai_native_production_time: string | null;
  proven_status: boolean;
  proven_date: string | null;
  version: number;
  author: string | null;
  validated_by: string | null;
  include_feedback_prompt: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

const inputStyle = {
  background: "var(--color-jda-bg-surface)",
  borderColor: "var(--color-jda-border)",
  color: "var(--color-jda-cream)",
};

const labelStyle = { color: "var(--color-jda-warm-gray)" };

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs mb-1 font-semibold" style={labelStyle}>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, readOnly }: { value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className="w-full text-sm px-3 py-2 rounded-md border outline-none"
      style={inputStyle}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 4, readOnly }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; readOnly?: boolean }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      readOnly={readOnly}
      className="w-full text-sm px-3 py-2 rounded-md border outline-none resize-y"
      style={inputStyle}
    />
  );
}

function JsonArrayEditor({
  items,
  onChange,
  fields,
  label,
  readOnly,
}: {
  items: NamedItem[];
  onChange: (items: NamedItem[]) => void;
  fields: { key: string; label: string; type: "text" | "textarea" }[];
  label: string;
  readOnly?: boolean;
}) {
  const addItem = () => {
    const blank: Record<string, string> = {};
    fields.forEach((f) => (blank[f.key] = ""));
    onChange([...items, blank as unknown as NamedItem]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, key: string, value: string) => {
    const updated = items.map((item, i) => (i === idx ? { ...item, [key]: value } : item));
    onChange(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", textTransform: "uppercase", ...labelStyle }}>
          {label} ({items.length})
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={addItem}
            className="text-xs font-semibold px-2 py-1 rounded cursor-pointer"
            style={{ background: "var(--color-jda-bg-surface)", color: "var(--color-jda-cream-muted)" }}
          >
            + Add
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--color-jda-warm-gray)" }}>None added yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="rounded-md border p-3"
              style={{ background: "var(--color-jda-bg)", borderColor: "var(--color-jda-border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: "var(--color-jda-cream-muted)" }}>
                  #{idx + 1}
                </span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-xs font-semibold px-2 py-0.5 rounded cursor-pointer"
                    style={{ color: "var(--color-jda-red)" }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {fields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs mb-0.5" style={labelStyle}>{f.label}</label>
                    {f.type === "textarea" ? (
                      <TextArea
                        value={(item as unknown as Record<string, string>)[f.key] ?? ""}
                        onChange={(v) => updateItem(idx, f.key, v)}
                        rows={3}
                        readOnly={readOnly}
                      />
                    ) : (
                      <TextInput
                        value={(item as unknown as Record<string, string>)[f.key] ?? ""}
                        onChange={(v) => updateItem(idx, f.key, v)}
                        readOnly={readOnly}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TagPicker({ tags, onChange, placeholder, readOnly }: { tags: string[]; onChange: (tags: string[]) => void; placeholder?: string; readOnly?: boolean }) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
      setInput("");
    }
  };

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-2">
        {tags.map((t, i) => (
          <span
            key={i}
            className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
            style={{ background: "var(--color-jda-bg-surface)", color: "var(--color-jda-cream-muted)" }}
          >
            {t}
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange(tags.filter((_, j) => j !== i))}
                className="ml-0.5 cursor-pointer"
                style={{ color: "var(--color-jda-warm-gray)" }}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {!readOnly && (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder={placeholder ?? "Add tag…"}
            className="flex-1 text-sm px-3 py-2 rounded-md border outline-none"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={addTag}
            className="text-xs font-semibold px-3 py-2 rounded-md cursor-pointer"
            style={{ background: "var(--color-jda-bg-surface)", color: "var(--color-jda-cream-muted)" }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

export default function MethodologyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [methodology, setMethodology] = useState<Methodology | null>(null);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  // Form state
  const [form, setForm] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    try {
      const [mRes, pRes] = await Promise.all([
        fetch(`/api/content/methodologies/${id}`),
        fetch("/api/practices"),
      ]);
      if (!mRes.ok) throw new Error("Methodology not found");
      const mData = await mRes.json();
      const m = mData.methodology;
      setMethodology(m);
      setForm({
        name: m.name ?? "",
        description: m.description ?? "",
        practice_id: m.practice_id ?? "",
        ai_classification: m.ai_classification ?? "",
        tools_involved: m.tools_involved ?? [],
        system_instructions: m.system_instructions ?? "",
        steps: Array.isArray(m.steps) ? m.steps : [],
        required_inputs: Array.isArray(m.required_inputs) ? m.required_inputs : [],
        output_format: m.output_format ?? "",
        quality_checks: Array.isArray(m.quality_checks) ? m.quality_checks : [],
        failure_modes: Array.isArray(m.failure_modes) ? m.failure_modes : [],
        client_refinements: Array.isArray(m.client_refinements) ? m.client_refinements : [],
        quality_checklist: Array.isArray(m.quality_checklist) ? m.quality_checklist : [],
        vision_of_good: m.vision_of_good ?? "",
        tips: m.tips ?? "",
        status: m.status ?? "draft",
        version: m.version ?? 1,
        proven_status: m.proven_status ?? false,
        author: m.author ?? "",
        validated_by: m.validated_by ?? "",
        baseline_production_time: m.baseline_production_time ?? "",
        ai_native_production_time: m.ai_native_production_time ?? "",
        include_feedback_prompt: m.include_feedback_prompt ?? false,
      });

      if (pRes.ok) {
        const pData = await pRes.json();
        setPractices(pData.practices ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        const tierLevel: Record<string, number> = { none: 0, viewer: 1, editor: 2, leadership: 3, admin: 4 };
        setCanEdit((tierLevel[data.portal_tier] ?? 0) >= 2);
      })
      .catch(() => {});
  }, []);

  const setField = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const payload = {
        ...form,
        practice_id: form.practice_id || null,
        ai_classification: form.ai_classification || null,
        version: Number(form.version) || 1,
      };
      const res = await fetch(`/api/content/methodologies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed");
      }
      const data = await res.json();
      setMethodology(data.methodology);
      setSaved(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/content/methodologies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/content/methodologies");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm" style={{ color: "var(--color-jda-warm-gray)" }}>Loading…</div>
      </div>
    );
  }

  if (error || !methodology) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm" style={{ color: "var(--color-jda-red)" }}>{error || "Not found"}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link
          href="/content/methodologies"
          className="text-xs font-semibold no-underline mb-2 inline-block"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em", color: "var(--color-jda-warm-gray)" }}
        >
          ← Methodologies
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1
              className="text-3xl font-black leading-none"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}
            >
              {methodology.name}
            </h1>
            {!canEdit && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--color-jda-bg-surface)", color: "var(--color-jda-warm-gray)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Read-only
              </span>
            )}
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs font-bold px-4 py-2 rounded-md cursor-pointer disabled:opacity-50"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--color-jda-red)", color: "#fff" }}
              >
                {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs font-bold px-4 py-2 rounded-md cursor-pointer"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--color-jda-bg-surface)", color: "var(--color-jda-red)" }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--color-jda-warm-gray)" }}>
          ID {methodology.id} · slug: {methodology.slug} · updated {new Date(methodology.updated_at).toLocaleDateString()}
        </p>
      </div>

      {canEdit && confirmDelete && (
        <div
          className="rounded-[10px] border p-6 mb-5"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-red)" }}
        >
          <p className="text-sm mb-4" style={{ color: "var(--color-jda-cream)" }}>
            Are you sure you want to delete <strong>{methodology.name}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-bold px-4 py-2 rounded-md cursor-pointer disabled:opacity-50"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--color-jda-red)", color: "#fff" }}
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs font-bold px-4 py-2 rounded-md cursor-pointer"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--color-jda-bg-surface)", color: "var(--color-jda-cream-muted)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Core fields */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Core details
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel>Name</FieldLabel>
              <TextInput value={form.name as string} onChange={(v) => setField("name", v)} readOnly={!canEdit} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Description</FieldLabel>
              <TextArea value={form.description as string} onChange={(v) => setField("description", v)} rows={3} readOnly={!canEdit} />
            </div>
            <div>
              <FieldLabel>Practice</FieldLabel>
              <select
                value={(form.practice_id as string | number) ?? ""}
                onChange={(e) => setField("practice_id", e.target.value ? Number(e.target.value) : "")}
                disabled={!canEdit}
                className="w-full text-sm px-3 py-2 rounded-md border outline-none"
                style={inputStyle}
              >
                <option value="">Agency-wide</option>
                {practices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>AI Classification</FieldLabel>
              <select
                value={(form.ai_classification as string) ?? ""}
                onChange={(e) => setField("ai_classification", e.target.value)}
                disabled={!canEdit}
                className="w-full text-sm px-3 py-2 rounded-md border outline-none"
                style={inputStyle}
              >
                <option value="">Select…</option>
                <option value="ai_led">AI-led</option>
                <option value="ai_assisted">AI-assisted</option>
                <option value="human_led">Human-led</option>
              </select>
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <select
                value={(form.status as string) ?? "draft"}
                onChange={(e) => setField("status", e.target.value)}
                disabled={!canEdit}
                className="w-full text-sm px-3 py-2 rounded-md border outline-none"
                style={inputStyle}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <FieldLabel>Version</FieldLabel>
              <input
                type="number"
                value={form.version as number}
                onChange={(e) => setField("version", parseInt(e.target.value) || 1)}
                min={1}
                readOnly={!canEdit}
                className="w-full text-sm px-3 py-2 rounded-md border outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel>Author</FieldLabel>
              <TextInput value={(form.author as string) ?? ""} onChange={(v) => setField("author", v)} readOnly={!canEdit} />
            </div>
            <div>
              <FieldLabel>Validated by</FieldLabel>
              <TextInput value={(form.validated_by as string) ?? ""} onChange={(v) => setField("validated_by", v)} readOnly={!canEdit} />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.proven_status as boolean}
                  onChange={(e) => setField("proven_status", e.target.checked)}
                  disabled={!canEdit}
                  className="accent-[var(--color-jda-red)]"
                />
                <span className="text-sm" style={{ color: "var(--color-jda-cream)" }}>Proven status</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.include_feedback_prompt as boolean}
                  onChange={(e) => setField("include_feedback_prompt", e.target.checked)}
                  disabled={!canEdit}
                  className="accent-[var(--color-jda-red)]"
                />
                <span className="text-sm" style={{ color: "var(--color-jda-cream)" }}>Include feedback prompt</span>
              </label>
            </div>
          </div>
        </div>

        {/* Production times */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Production times
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Baseline production time</FieldLabel>
              <TextInput value={(form.baseline_production_time as string) ?? ""} onChange={(v) => setField("baseline_production_time", v)} placeholder="e.g. 4 hours" readOnly={!canEdit} />
            </div>
            <div>
              <FieldLabel>AI-native production time</FieldLabel>
              <TextInput value={(form.ai_native_production_time as string) ?? ""} onChange={(v) => setField("ai_native_production_time", v)} placeholder="e.g. 45 minutes" readOnly={!canEdit} />
            </div>
          </div>
        </div>

        {/* Tools */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Tools involved
          </div>
          <TagPicker
            tags={(form.tools_involved as string[]) ?? []}
            onChange={(v) => setField("tools_involved", v)}
            placeholder="Add tool name…"
            readOnly={!canEdit}
          />
        </div>

        {/* System instructions */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            System instructions
          </div>
          <TextArea
            value={(form.system_instructions as string) ?? ""}
            onChange={(v) => setField("system_instructions", v)}
            rows={10}
            placeholder="Full system prompt for Claude…"
            readOnly={!canEdit}
          />
        </div>

        {/* Output format */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Output format
          </div>
          <TextArea
            value={(form.output_format as string) ?? ""}
            onChange={(v) => setField("output_format", v)}
            rows={4}
            readOnly={!canEdit}
          />
        </div>

        {/* Steps */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <JsonArrayEditor
            label="Steps"
            items={(form.steps as NamedItem[]) ?? []}
            onChange={(v) => setField("steps", v)}
            fields={[
              { key: "name", label: "Step name", type: "text" },
              { key: "instructions", label: "Instructions", type: "textarea" },
            ]}
            readOnly={!canEdit}
          />
        </div>

        {/* Required inputs */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <JsonArrayEditor
            label="Required inputs"
            items={(form.required_inputs as NamedItem[]) ?? []}
            onChange={(v) => setField("required_inputs", v)}
            fields={[
              { key: "name", label: "Input name", type: "text" },
              { key: "description", label: "Description", type: "text" },
            ]}
            readOnly={!canEdit}
          />
        </div>

        {/* Quality checks */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <JsonArrayEditor
            label="Quality checks"
            items={(form.quality_checks as NamedItem[]) ?? []}
            onChange={(v) => setField("quality_checks", v)}
            fields={[
              { key: "name", label: "Check name", type: "text" },
              { key: "description", label: "Description", type: "textarea" },
            ]}
            readOnly={!canEdit}
          />
        </div>

        {/* Failure modes */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <JsonArrayEditor
            label="Failure modes"
            items={(form.failure_modes as NamedItem[]) ?? []}
            onChange={(v) => setField("failure_modes", v)}
            fields={[
              { key: "name", label: "Failure mode", type: "text" },
              { key: "description", label: "Description", type: "textarea" },
            ]}
            readOnly={!canEdit}
          />
        </div>

        {/* Client refinements */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <JsonArrayEditor
            label="Client refinements"
            items={(form.client_refinements as NamedItem[]) ?? []}
            onChange={(v) => setField("client_refinements", v)}
            fields={[
              { key: "name", label: "Refinement", type: "text" },
              { key: "description", label: "Details", type: "textarea" },
            ]}
            readOnly={!canEdit}
          />
        </div>

        {/* Quality checklist */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <JsonArrayEditor
            label="Quality checklist"
            items={(form.quality_checklist as NamedItem[]) ?? []}
            onChange={(v) => setField("quality_checklist", v)}
            fields={[
              { key: "name", label: "Checklist item", type: "text" },
              { key: "description", label: "Details", type: "text" },
            ]}
            readOnly={!canEdit}
          />
        </div>

        {/* Vision of good / tips */}
        <div
          className="rounded-[10px] p-6 border"
          style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}
        >
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Vision of good & tips
          </div>
          <div className="space-y-4">
            <div>
              <FieldLabel>Vision of good</FieldLabel>
              <TextArea value={(form.vision_of_good as string) ?? ""} onChange={(v) => setField("vision_of_good", v)} rows={3} readOnly={!canEdit} />
            </div>
            <div>
              <FieldLabel>Tips</FieldLabel>
              <TextArea value={(form.tips as string) ?? ""} onChange={(v) => setField("tips", v)} rows={3} readOnly={!canEdit} />
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex gap-3 pt-2 pb-8">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs font-bold px-6 py-2.5 rounded-md cursor-pointer disabled:opacity-50"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--color-jda-red)", color: "#fff" }}
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
