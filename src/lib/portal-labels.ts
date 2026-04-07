export const TEMPLATE_FORMAT_LABELS: Record<string, string> = {
  "html-deliverable": "HTML deliverable",
  "word-document": "Word document",
  "html-email": "HTML email",
};

export function templateFormatLabel(value: string | undefined): string {
  if (!value) return "—";
  return TEMPLATE_FORMAT_LABELS[value] ?? value;
}

export const TEMPLATE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  deprecated: "Deprecated",
};

export function templateStatusLabel(value: string | undefined): string {
  if (!value) return "—";
  return TEMPLATE_STATUS_LABELS[value] ?? value;
}

export const METHODOLOGY_CLASS_LABELS: Record<string, string> = {
  ai_led: "AI-led",
  ai_assisted: "AI-assisted",
  human_led: "Human-led",
};

export function methodologyClassLabel(value: string | undefined): string {
  if (!value) return "—";
  return METHODOLOGY_CLASS_LABELS[value] ?? value;
}

export const PRACTICE_ACTIVATION_LABELS: Record<string, string> = {
  not_started: "Not started",
  in_discovery: "In discovery",
  activating: "Activating",
  active: "Active",
};

export function practiceActivationLabel(value: string | undefined): string {
  if (!value) return "—";
  return PRACTICE_ACTIVATION_LABELS[value] ?? value;
}
