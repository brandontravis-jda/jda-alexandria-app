"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface Practice {
  id: number;
  name: string;
}

interface MethodologyOption {
  id: number;
  name: string;
}

interface Template {
  id: number;
  title: string;
  slug: string;
  format_type: string | null;
  preview_url: string;
  github_raw_url: string;
  dropbox_link: string;
  use_cases: string;
  feature_list: string;
  fixed_elements: string;
  variable_elements: string;
  brand_injection_rules: string;
  client_adaptation_notes: string;
  output_spec: string;
  quality_checks: string;
  include_feedback_prompt: boolean;
  status: string;
  practice_ids?: number[];
  methodology_ids?: number[];
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
  return <label className="block text-xs mb-1 font-semibold" style={labelStyle}>{children}</label>;
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

function MultiSelect({ options, selected, onChange, label, readOnly }: { options: { id: number; name: string }[]; selected: number[]; onChange: (ids: number[]) => void; label: string; readOnly?: boolean }) {
  const toggle = (id: number) => {
    if (readOnly) return;
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2 mt-1">
        {options.length === 0 && (
          <span className="text-xs" style={{ color: "var(--color-jda-warm-gray)" }}>None available</span>
        )}
        {options.map((o) => {
          const active = selected.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              disabled={readOnly}
              className="text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors disabled:cursor-default"
              style={{
                background: active ? "var(--color-jda-red-muted)" : "var(--color-jda-bg-surface)",
                borderColor: active ? "var(--color-jda-red)" : "var(--color-jda-border)",
                color: active ? "var(--color-jda-red)" : "var(--color-jda-cream-muted)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {o.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [methodologies, setMethodologies] = useState<MethodologyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const [form, setForm] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    try {
      const [tRes, pRes, mRes] = await Promise.all([
        fetch(`/api/content/templates/${id}`),
        fetch("/api/practices"),
        fetch("/api/content/methodologies"),
      ]);
      if (!tRes.ok) throw new Error("Template not found");
      const tData = await tRes.json();
      const t = tData.template;
      setTemplate(t);
      setForm({
        title: t.title ?? "",
        format_type: t.format_type ?? "",
        preview_url: t.preview_url ?? "",
        github_raw_url: t.github_raw_url ?? "",
        dropbox_link: t.dropbox_link ?? "",
        use_cases: t.use_cases ?? "",
        feature_list: t.feature_list ?? "",
        fixed_elements: t.fixed_elements ?? "",
        variable_elements: t.variable_elements ?? "",
        brand_injection_rules: t.brand_injection_rules ?? "",
        client_adaptation_notes: t.client_adaptation_notes ?? "",
        output_spec: t.output_spec ?? "",
        quality_checks: t.quality_checks ?? "",
        include_feedback_prompt: t.include_feedback_prompt ?? false,
        status: t.status ?? "draft",
        practice_ids: t.practice_ids ?? [],
        methodology_ids: t.methodology_ids ?? [],
      });

      if (pRes.ok) {
        const pData = await pRes.json();
        setPractices(pData.practices ?? []);
      }
      if (mRes.ok) {
        const mData = await mRes.json();
        setMethodologies((mData.methodologies ?? []).map((m: { id: number; name: string }) => ({ id: m.id, name: m.name })));
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
        format_type: form.format_type || null,
      };
      const res = await fetch(`/api/content/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed");
      }
      const data = await res.json();
      setTemplate(data.template);
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
      const res = await fetch(`/api/content/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/content/templates");
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

  if (error || !template) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm" style={{ color: "var(--color-jda-red)" }}>{error || "Not found"}</div>
      </div>
    );
  }

  const textFields: { key: string; label: string; rows?: number }[] = [
    { key: "use_cases", label: "Use cases", rows: 3 },
    { key: "feature_list", label: "Feature list", rows: 3 },
    { key: "fixed_elements", label: "Fixed elements", rows: 3 },
    { key: "variable_elements", label: "Variable elements", rows: 3 },
    { key: "brand_injection_rules", label: "Brand injection rules", rows: 3 },
    { key: "client_adaptation_notes", label: "Client adaptation notes", rows: 3 },
    { key: "output_spec", label: "Output specification", rows: 4 },
    { key: "quality_checks", label: "Quality checks", rows: 3 },
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link
          href="/content/templates"
          className="text-xs font-semibold no-underline mb-2 inline-block"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em", color: "var(--color-jda-warm-gray)" }}
        >
          ← Templates
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black leading-none" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
              {template.title}
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
          ID {template.id} · slug: {template.slug} · updated {new Date(template.updated_at).toLocaleDateString()}
        </p>
      </div>

      {canEdit && confirmDelete && (
        <div className="rounded-[10px] border p-6 mb-5" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-red)" }}>
          <p className="text-sm mb-4" style={{ color: "var(--color-jda-cream)" }}>
            Are you sure you want to delete <strong>{template.title}</strong>? This cannot be undone.
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
        <div className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Core details
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel>Title</FieldLabel>
              <TextInput value={form.title as string} onChange={(v) => setField("title", v)} readOnly={!canEdit} />
            </div>
            <div>
              <FieldLabel>Format type</FieldLabel>
              <select
                value={(form.format_type as string) ?? ""}
                onChange={(e) => setField("format_type", e.target.value)}
                disabled={!canEdit}
                className="w-full text-sm px-3 py-2 rounded-md border outline-none"
                style={inputStyle}
              >
                <option value="">Select…</option>
                <option value="html-deliverable">HTML deliverable</option>
                <option value="word-document">Word document</option>
                <option value="html-email">HTML email</option>
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
                <option value="deprecated">Deprecated</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
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

        {/* URLs */}
        <div className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            URLs
          </div>
          <div className="grid gap-4">
            <div>
              <FieldLabel>Preview URL</FieldLabel>
              <TextInput value={(form.preview_url as string) ?? ""} onChange={(v) => setField("preview_url", v)} placeholder="https://…" readOnly={!canEdit} />
            </div>
            <div>
              <FieldLabel>GitHub raw URL</FieldLabel>
              <TextInput value={(form.github_raw_url as string) ?? ""} onChange={(v) => setField("github_raw_url", v)} placeholder="https://raw.githubusercontent.com/…" readOnly={!canEdit} />
            </div>
            <div>
              <FieldLabel>Dropbox link</FieldLabel>
              <TextInput value={(form.dropbox_link as string) ?? ""} onChange={(v) => setField("dropbox_link", v)} placeholder="https://…" readOnly={!canEdit} />
            </div>
          </div>
        </div>

        {/* Relationships */}
        <div className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Relationships
          </div>
          <div className="space-y-4">
            <MultiSelect
              label="Practice areas"
              options={practices}
              selected={(form.practice_ids as number[]) ?? []}
              onChange={(v) => setField("practice_ids", v)}
              readOnly={!canEdit}
            />
            <MultiSelect
              label="Linked methodologies"
              options={methodologies}
              selected={(form.methodology_ids as number[]) ?? []}
              onChange={(v) => setField("methodology_ids", v)}
              readOnly={!canEdit}
            />
          </div>
        </div>

        {/* Text fields */}
        {textFields.map((tf) => (
          <div key={tf.key} className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
            <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
              {tf.label}
            </div>
            <TextArea
              value={(form[tf.key] as string) ?? ""}
              onChange={(v) => setField(tf.key, v)}
              rows={tf.rows}
              readOnly={!canEdit}
            />
          </div>
        ))}

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
