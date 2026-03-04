import Container from "@/components/ui/Container";
import PortableText from "@/components/ui/PortableText";
import type { TextBlockProps } from "./types";

export default function TextBlock({ body }: TextBlockProps) {
  if (!body?.length) return null;

  return (
    <Container>
      <div className="mx-auto max-w-3xl">
        <PortableText value={body} />
      </div>
    </Container>
  );
}
