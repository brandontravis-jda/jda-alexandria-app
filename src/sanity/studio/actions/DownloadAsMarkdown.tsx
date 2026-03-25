"use client";

import type { DocumentActionComponent, DocumentActionProps } from "sanity";

// Fields to always skip — internal Sanity metadata and non-content fields
const SKIP_FIELDS = new Set([
  "_id", "_type", "_rev", "_createdAt", "_updatedAt",
  "slug", // rendered inline as part of the header
]);

// Fields that render as inline header metadata rather than body sections
const METADATA_FIELDS = new Set([
  "status", "formatType", "previewUrl", "githubRawUrl", "dropboxLink",
  "aiClassification", "provenStatus", "provenDate", "version", "author",
  "validatedBy", "extractedDate", "sourceDocument", "extractedBy",
  "abbreviations", "colorUsageRules", "gaps",
]);

// Human-readable labels for known field names
const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  title: "Title",
  clientName: "Client Name",
  description: "Description",
  useCases: "Use Cases",
  featureList: "Feature List",
  fixedElements: "Fixed Elements",
  variableElements: "Variable Elements",
  brandInjectionRules: "Brand Injection Rules",
  clientAdaptationNotes: "Client Adaptation Notes",
  outputSpec: "Output Specification",
  qualityChecks: "Quality Checks",
  systemInstructions: "System Instructions",
  visionOfGood: "Vision of Good",
  tips: "Tips",
  outputFormat: "Output Format",
  failureModes: "Failure Modes",
  steps: "Steps",
  requiredInputs: "Required Inputs",
  clientRefinements: "Client Refinements",
  rawMarkdown: "Full Brand Package",
  identity: "Identity",
  colorPalette: "Color Palette",
  typography: "Typography",
  voiceAndTone: "Voice and Tone",
  brandArchitecture: "Brand Architecture",
  visualDirection: "Visual Direction",
  keyMessaging: "Key Messaging",
  practiceAreas: "Practice Areas",
  relatedMethodologies: "Related Methodologies",
  practice: "Practice Area",
  toolsInvolved: "Tools Involved",
};

// Human-readable labels for known enum values
const ENUM_LABELS: Record<string, Record<string, string>> = {
  formatType: {
    "editorial-html": "Editorial HTML",
    "slideshow-html": "Slideshow HTML",
    "web-landing-page": "Web Landing Page",
    "word-document": "Word Document",
    "html-email": "HTML Email",
  },
  aiClassification: {
    ai_led: "AI-Led",
    ai_assisted: "AI-Assisted",
    human_led: "Human-Led",
  },
  status: {
    draft: "Draft",
    active: "Active",
    deprecated: "Deprecated",
  },
};

function toLabel(fieldName: string): string {
  return (
    FIELD_LABELS[fieldName] ??
    fieldName
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim()
  );
}

function renderValue(
  value: unknown,
  fieldName: string,
  depth: number = 0
): string {
  if (value === null || value === undefined || value === "") return "";

  const indent = "  ".repeat(depth);

  // Strings and numbers — just render the value
  if (typeof value === "string") {
    const enumLabel = ENUM_LABELS[fieldName]?.[value];
    return enumLabel ?? value;
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";

  // Arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    // Array of strings (e.g. toolsInvolved)
    if (typeof value[0] === "string") {
      return value.map((v) => `${indent}- ${v}`).join("\n");
    }
    // Array of objects — render each as a sub-block
    return value
      .map((item, i) => {
        if (typeof item !== "object" || item === null) return `${indent}- ${item}`;
        const obj = item as Record<string, unknown>;
        const itemTitle =
          (obj.name as string) ??
          (obj.colorName as string) ??
          (obj.client as string) ??
          `Item ${i + 1}`;
        const subFields = Object.entries(obj)
          .filter(([k]) => !["_key", "_type", "name", "colorName", "client"].includes(k))
          .map(([k, v]) => {
            const rendered = renderValue(v, k, depth + 1);
            if (!rendered) return null;
            return `${indent}  **${toLabel(k)}:** ${rendered.includes("\n") ? "\n" + rendered : rendered}`;
          })
          .filter(Boolean)
          .join("\n");
        return `${indent}### ${itemTitle}\n${subFields}`;
      })
      .join("\n\n");
  }

  // Objects — render sub-fields
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Skip Sanity reference objects (they just have _ref)
    if ("_ref" in obj) return "";
    // Skip slug objects
    if ("current" in obj) return (obj.current as string) ?? "";

    return Object.entries(obj)
      .filter(([k]) => !["_type"].includes(k))
      .map(([k, v]) => {
        const rendered = renderValue(v, k, depth + 1);
        if (!rendered) return null;
        return `${indent}**${toLabel(k)}:** ${rendered.includes("\n") ? "\n" + rendered : rendered}`;
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function getDocTitle(doc: Record<string, unknown>): string {
  return (
    (doc.title as string) ??
    (doc.name as string) ??
    (doc.clientName as string) ??
    "Untitled"
  );
}

function getDocTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    template: "Template",
    productionMethodology: "Production Methodology",
    clientBrandPackage: "Client Brand Package",
  };
  return (
    labels[type] ??
    type.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
  );
}

// For brand packages, the rawMarkdown field is the Claude-ready version —
// use it as the primary body rather than re-assembling from structured fields.
function isBrandPackage(type: string): boolean {
  return type === "clientBrandPackage";
}

function assembleMarkdown(
  doc: Record<string, unknown>,
  type: string
): string {
  const title = getDocTitle(doc);
  const typeLabel = getDocTypeLabel(type);
  const lines: string[] = [];

  // Header
  lines.push(`# ${typeLabel}: ${title}`);
  lines.push("");

  // Inline metadata fields
  const metadataLines: string[] = [];
  for (const [key, value] of Object.entries(doc)) {
    if (!METADATA_FIELDS.has(key)) continue;
    if (value === null || value === undefined || value === "") continue;
    const rendered = renderValue(value, key);
    if (!rendered) continue;
    metadataLines.push(`**${toLabel(key)}:** ${rendered}`);
  }
  if (metadataLines.length > 0) {
    lines.push(...metadataLines);
    lines.push("");
  }

  lines.push("---");

  // Brand packages: use rawMarkdown as the body if present
  if (isBrandPackage(type) && doc.rawMarkdown) {
    lines.push("");
    lines.push((doc.rawMarkdown as string).trim());
    return lines.join("\n");
  }

  // All other content types: render each body field as a section
  for (const [key, value] of Object.entries(doc)) {
    if (SKIP_FIELDS.has(key)) continue;
    if (METADATA_FIELDS.has(key)) continue;
    if (key === "rawMarkdown") continue; // already handled above
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "object" && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      if ("_ref" in obj) continue; // skip bare references
    }

    const rendered = renderValue(value, key);
    if (!rendered) continue;

    lines.push("");
    lines.push(`## ${toLabel(key)}`);
    lines.push("");
    lines.push(rendered);
    lines.push("");
    lines.push("---");
  }

  return lines.join("\n");
}

function getFilename(doc: Record<string, unknown>, type: string): string {
  const slug =
    (doc.slug as { current?: string })?.current ??
    getDocTitle(doc)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const prefixes: Record<string, string> = {
    template: "template",
    productionMethodology: "methodology",
    clientBrandPackage: "brand-package",
  };
  const prefix = prefixes[type] ?? type;
  return `${prefix}-${slug}.md`;
}

export const DownloadAsMarkdown: DocumentActionComponent = (
  props: DocumentActionProps
) => {
  const { draft, published, type } = props;
  const doc = (draft ?? published) as Record<string, unknown> | null;

  if (!doc) return null;

  return {
    label: "Download as Markdown",
    icon: () => "⬇",
    onHandle: () => {
      const markdown = assembleMarkdown(doc, type);
      const filename = getFilename(doc, type);

      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  };
};
