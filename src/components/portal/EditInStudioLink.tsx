import Link from "next/link";
import { studioEditDocumentHref } from "@/lib/studio-href";

interface EditInStudioLinkProps {
  documentId: string;
  schemaType: string;
  className?: string;
}

export default function EditInStudioLink({ documentId, schemaType, className }: EditInStudioLinkProps) {
  return (
    <Link
      href={studioEditDocumentHref(documentId, schemaType)}
      className={`text-xs font-semibold no-underline inline-flex items-center gap-1 ${className ?? ""}`}
      style={{
        fontFamily: "var(--font-display)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--color-jda-red)",
      }}
    >
      Edit in Studio
      <span aria-hidden className="opacity-70">
        ↗
      </span>
    </Link>
  );
}
