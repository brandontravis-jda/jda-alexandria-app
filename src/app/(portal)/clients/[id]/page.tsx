"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface ColorSwatch {
  colorName: string;
  hex: string;
  role: string;
  usageNotes: string;
}

interface BrandPackage {
  id: number;
  client_name: string;
  slug: string;
  abbreviations: string | null;
  logo_usage_rules: string;
  extracted_date: string | null;
  source_document: string | null;
  extracted_by: string | null;
  gaps: string;
  raw_markdown: string;
  identity: Record<string, string>;
  color_palette: ColorSwatch[];
  color_usage_rules: string;
  typography: Record<string, string>;
  template_overrides: string;
  voice_and_tone: Record<string, string>;
  brand_architecture: Record<string, string>;
  visual_direction: Record<string, string>;
  key_messaging: Record<string, string>;
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
  return <label className="block text-xs mb-1 font-semibold" style={labelStyle}>{children}</label>;
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm px-3 py-2 rounded-md border outline-none"
      style={inputStyle}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full text-sm px-3 py-2 rounded-md border outline-none resize-y"
      style={inputStyle}
    />
  );
}

function JsonObjectEditor({ obj, onChange, fields }: {
  obj: Record<string, string>;
  onChange: (obj: Record<string, string>) => void;
  fields: { key: string; label: string; type: "text" | "textarea" }[];
}) {
  return (
    <div className="grid gap-3">
      {fields.map((f) => (
        <div key={f.key}>
          <FieldLabel>{f.label}</FieldLabel>
          {f.type === "textarea" ? (
            <TextArea
              value={obj[f.key] ?? ""}
              onChange={(v) => onChange({ ...obj, [f.key]: v })}
              rows={3}
            />
          ) : (
            <TextInput
              value={obj[f.key] ?? ""}
              onChange={(v) => onChange({ ...obj, [f.key]: v })}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function ClientBrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [brand, setBrand] = useState<BrandPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/content/brand-packages/${id}`);
      if (!res.ok) throw new Error("Brand package not found");
      const data = await res.json();
      const b = data.brand_package;
      setBrand(b);
      setForm({
        client_name: b.client_name ?? "",
        abbreviations: b.abbreviations ?? "",
        source_document: b.source_document ?? "",
        extracted_by: b.extracted_by ?? "",
        extracted_date: b.extracted_date ?? "",
        gaps: b.gaps ?? "",
        logo_usage_rules: b.logo_usage_rules ?? "",
        template_overrides: b.template_overrides ?? "",
        color_usage_rules: b.color_usage_rules ?? "",
        raw_markdown: b.raw_markdown ?? "",
        status: b.status ?? "active",
        identity: b.identity && typeof b.identity === "object" ? b.identity : {},
        color_palette: Array.isArray(b.color_palette) ? b.color_palette : [],
        typography: b.typography && typeof b.typography === "object" ? b.typography : {},
        voice_and_tone: b.voice_and_tone && typeof b.voice_and_tone === "object" ? b.voice_and_tone : {},
        brand_architecture: b.brand_architecture && typeof b.brand_architecture === "object" ? b.brand_architecture : {},
        visual_direction: b.visual_direction && typeof b.visual_direction === "object" ? b.visual_direction : {},
        key_messaging: b.key_messaging && typeof b.key_messaging === "object" ? b.key_messaging : {},
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const setField = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/content/brand-packages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed");
      }
      const data = await res.json();
      setBrand(data.brand_package);
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
      const res = await fetch(`/api/content/brand-packages/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/clients");
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

  if (error || !brand) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm" style={{ color: "var(--color-jda-red)" }}>{error || "Not found"}</div>
      </div>
    );
  }

  const colorPalette = (form.color_palette as ColorSwatch[]) ?? [];

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link
          href="/clients"
          className="text-xs font-semibold no-underline mb-2 inline-block"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "0.08em", color: "var(--color-jda-warm-gray)" }}
        >
          ← Clients
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-3xl font-black leading-none" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>
            {brand.client_name}
          </h1>
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
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--color-jda-warm-gray)" }}>
          ID {brand.id} · slug: {brand.slug} · updated {new Date(brand.updated_at).toLocaleDateString()}
        </p>
      </div>

      {confirmDelete && (
        <div className="rounded-[10px] border p-6 mb-5" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-red)" }}>
          <p className="text-sm mb-4" style={{ color: "var(--color-jda-cream)" }}>
            Are you sure you want to delete <strong>{brand.client_name}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={deleting} className="text-xs font-bold px-4 py-2 rounded-md cursor-pointer disabled:opacity-50" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--color-jda-red)", color: "#fff" }}>
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs font-bold px-4 py-2 rounded-md cursor-pointer" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--color-jda-bg-surface)", color: "var(--color-jda-cream-muted)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Core details */}
        <div className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Core details
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel>Client name</FieldLabel>
              <TextInput value={form.client_name as string} onChange={(v) => setField("client_name", v)} />
            </div>
            <div>
              <FieldLabel>Abbreviations</FieldLabel>
              <TextInput value={form.abbreviations as string} onChange={(v) => setField("abbreviations", v)} placeholder="e.g. ACME, AC" />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <select
                value={(form.status as string) ?? "active"}
                onChange={(e) => setField("status", e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-md border outline-none"
                style={inputStyle}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <FieldLabel>Source document</FieldLabel>
              <TextInput value={form.source_document as string} onChange={(v) => setField("source_document", v)} />
            </div>
            <div>
              <FieldLabel>Extracted by</FieldLabel>
              <TextInput value={form.extracted_by as string} onChange={(v) => setField("extracted_by", v)} />
            </div>
            <div>
              <FieldLabel>Extracted date</FieldLabel>
              <input
                type="date"
                value={(form.extracted_date as string)?.substring(0, 10) ?? ""}
                onChange={(e) => setField("extracted_date", e.target.value || null)}
                className="w-full text-sm px-3 py-2 rounded-md border outline-none"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Identity
          </div>
          <JsonObjectEditor
            obj={(form.identity as Record<string, string>) ?? {}}
            onChange={(v) => setField("identity", v)}
            fields={[
              { key: "tagline", label: "Tagline", type: "text" },
              { key: "brandPersonality", label: "Brand personality", type: "textarea" },
              { key: "brandVoice", label: "Brand voice", type: "textarea" },
              { key: "brandExperience", label: "Brand experience", type: "textarea" },
            ]}
          />
        </div>

        {/* Voice and tone */}
        <div className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Voice & tone
          </div>
          <JsonObjectEditor
            obj={(form.voice_and_tone as Record<string, string>) ?? {}}
            onChange={(v) => setField("voice_and_tone", v)}
            fields={[
              { key: "toneDescription", label: "Tone description", type: "textarea" },
              { key: "doThis", label: "Do this", type: "textarea" },
              { key: "avoidThis", label: "Avoid this", type: "textarea" },
              { key: "writingStyle", label: "Writing style", type: "textarea" },
            ]}
          />
        </div>

        {/* Color palette */}
        <div className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
              Color palette ({colorPalette.length})
            </span>
            <button
              type="button"
              onClick={() => setField("color_palette", [...colorPalette, { colorName: "", hex: "", role: "", usageNotes: "" }])}
              className="text-xs font-semibold px-2 py-1 rounded cursor-pointer"
              style={{ background: "var(--color-jda-bg-surface)", color: "var(--color-jda-cream-muted)" }}
            >
              + Add
            </button>
          </div>
          {colorPalette.length === 0 ? (
            <p className="text-xs" style={labelStyle}>No colors added yet.</p>
          ) : (
            <div className="space-y-3">
              {colorPalette.map((c, i) => (
                <div key={i} className="rounded-md border p-3" style={{ background: "var(--color-jda-bg)", borderColor: "var(--color-jda-border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {c.hex && (
                        <span className="inline-block w-5 h-5 rounded border flex-shrink-0" style={{ background: c.hex, borderColor: "var(--color-jda-border)" }} />
                      )}
                      <span className="text-xs font-semibold" style={{ color: "var(--color-jda-cream-muted)" }}>
                        {c.colorName || `Color #${i + 1}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setField("color_palette", colorPalette.filter((_, j) => j !== i))}
                      className="text-xs font-semibold cursor-pointer"
                      style={{ color: "var(--color-jda-red)" }}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs mb-0.5" style={labelStyle}>Color name</label>
                      <TextInput value={c.colorName} onChange={(v) => {
                        const updated = [...colorPalette]; updated[i] = { ...updated[i], colorName: v }; setField("color_palette", updated);
                      }} />
                    </div>
                    <div>
                      <label className="block text-xs mb-0.5" style={labelStyle}>Hex</label>
                      <div className="flex gap-2">
                        <input type="color" value={c.hex || "#000000"} onChange={(e) => {
                          const updated = [...colorPalette]; updated[i] = { ...updated[i], hex: e.target.value }; setField("color_palette", updated);
                        }} className="w-10 h-9 rounded border cursor-pointer" style={{ borderColor: "var(--color-jda-border)" }} />
                        <TextInput value={c.hex} onChange={(v) => {
                          const updated = [...colorPalette]; updated[i] = { ...updated[i], hex: v }; setField("color_palette", updated);
                        }} placeholder="#000000" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs mb-0.5" style={labelStyle}>Role</label>
                      <TextInput value={c.role} onChange={(v) => {
                        const updated = [...colorPalette]; updated[i] = { ...updated[i], role: v }; setField("color_palette", updated);
                      }} placeholder="e.g. primary, accent" />
                    </div>
                    <div>
                      <label className="block text-xs mb-0.5" style={labelStyle}>Usage notes</label>
                      <TextInput value={c.usageNotes} onChange={(v) => {
                        const updated = [...colorPalette]; updated[i] = { ...updated[i], usageNotes: v }; setField("color_palette", updated);
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <FieldLabel>Color usage rules</FieldLabel>
            <TextArea value={form.color_usage_rules as string} onChange={(v) => setField("color_usage_rules", v)} rows={3} />
          </div>
        </div>

        {/* Typography */}
        <div className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Typography
          </div>
          <JsonObjectEditor
            obj={(form.typography as Record<string, string>) ?? {}}
            onChange={(v) => setField("typography", v)}
            fields={[
              { key: "headingFont", label: "Heading font", type: "text" },
              { key: "bodyFont", label: "Body font", type: "text" },
              { key: "accentFont", label: "Accent font", type: "text" },
              { key: "pairingRules", label: "Pairing rules", type: "textarea" },
            ]}
          />
        </div>

        {/* Brand architecture */}
        <div className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Brand architecture
          </div>
          <JsonObjectEditor
            obj={(form.brand_architecture as Record<string, string>) ?? {}}
            onChange={(v) => setField("brand_architecture", v)}
            fields={[
              { key: "structure", label: "Structure", type: "textarea" },
              { key: "subBrands", label: "Sub-brands", type: "textarea" },
              { key: "hierarchy", label: "Hierarchy", type: "textarea" },
            ]}
          />
        </div>

        {/* Visual direction */}
        <div className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Visual direction
          </div>
          <JsonObjectEditor
            obj={(form.visual_direction as Record<string, string>) ?? {}}
            onChange={(v) => setField("visual_direction", v)}
            fields={[
              { key: "photographyStyle", label: "Photography style", type: "textarea" },
              { key: "illustrationStyle", label: "Illustration style", type: "textarea" },
              { key: "iconography", label: "Iconography", type: "textarea" },
            ]}
          />
        </div>

        {/* Key messaging */}
        <div className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Key messaging
          </div>
          <JsonObjectEditor
            obj={(form.key_messaging as Record<string, string>) ?? {}}
            onChange={(v) => setField("key_messaging", v)}
            fields={[
              { key: "valueProposition", label: "Value proposition", type: "textarea" },
              { key: "elevatorPitch", label: "Elevator pitch", type: "textarea" },
              { key: "keyMessages", label: "Key messages", type: "textarea" },
            ]}
          />
        </div>

        {/* Logo usage */}
        <div className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Logo usage rules
          </div>
          <TextArea value={form.logo_usage_rules as string} onChange={(v) => setField("logo_usage_rules", v)} rows={4} />
        </div>

        {/* Template overrides */}
        <div className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Template overrides
          </div>
          <TextArea value={form.template_overrides as string} onChange={(v) => setField("template_overrides", v)} rows={3} />
        </div>

        {/* Gaps */}
        <div className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-amber)" }}>
            Extraction gaps
          </div>
          <TextArea value={form.gaps as string} onChange={(v) => setField("gaps", v)} rows={3} />
        </div>

        {/* Raw markdown */}
        <div className="rounded-[10px] p-6 border" style={{ background: "var(--color-jda-bg-card)", borderColor: "var(--color-jda-border)" }}>
          <div className="text-sm font-bold mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-jda-cream)" }}>
            Full brand package (markdown)
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--color-jda-warm-gray)" }}>
            As served to Claude for rich context. This is the primary content field.
          </p>
          <TextArea value={form.raw_markdown as string} onChange={(v) => setField("raw_markdown", v)} rows={16} />
        </div>

        {/* Bottom save */}
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
      </div>
    </div>
  );
}
