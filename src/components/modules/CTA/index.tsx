import { cn } from "@/lib/utils";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import type { CTAProps } from "./types";

const bgStyles = {
  default: "bg-brand-background",
  primary: "bg-brand-primary text-white",
  surface: "bg-brand-surface",
};

export default function CTA({
  heading,
  body,
  primaryButton,
  secondaryButton,
  backgroundColor = "default",
}: CTAProps) {
  const isPrimary = backgroundColor === "primary";

  return (
    <div className={cn("py-section", bgStyles[backgroundColor])}>
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <h2
            className={cn(
              "font-display text-3xl font-bold sm:text-4xl",
              isPrimary ? "text-white" : "text-brand-text-heading"
            )}
          >
            {heading}
          </h2>

          {body && (
            <p
              className={cn(
                "mt-4 text-lg",
                isPrimary ? "text-white/90" : "text-brand-muted"
              )}
            >
              {body}
            </p>
          )}

          {(primaryButton?.label || secondaryButton?.label) && (
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {primaryButton?.label && (
                <Button
                  href={primaryButton.url}
                  isExternal={primaryButton.isExternal}
                  variant={isPrimary ? "outline" : "primary"}
                  className={isPrimary ? "border-white text-white hover:bg-white hover:text-brand-primary" : ""}
                >
                  {primaryButton.label}
                </Button>
              )}
              {secondaryButton?.label && (
                <Button
                  href={secondaryButton.url}
                  isExternal={secondaryButton.isExternal}
                  variant="outline"
                  className={isPrimary ? "border-white/60 text-white hover:bg-white hover:text-brand-primary" : ""}
                >
                  {secondaryButton.label}
                </Button>
              )}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
