import { cn } from "@/lib/utils";
import SanityImage from "@/components/ui/SanityImage";
import Button from "@/components/ui/Button";
import type { HeroProps } from "./types";

export default function Hero({
  heading,
  subheading,
  cta,
  backgroundImage,
}: HeroProps) {
  return (
    <div className="relative flex min-h-[60vh] items-center justify-center overflow-hidden">
      {backgroundImage?.asset && (
        <div className="absolute inset-0">
          <SanityImage
            image={backgroundImage}
            fill
            priority
            sizes="100vw"
            className="h-full w-full"
          />
          <div className="absolute inset-0 bg-brand-primary/60" />
        </div>
      )}

      <div
        className={cn(
          "relative z-10 mx-auto max-w-[var(--container-content)] px-4 py-20 text-center sm:px-6 lg:px-8",
          backgroundImage?.asset ? "text-white" : "text-brand-text-heading"
        )}
      >
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {heading}
        </h1>

        {subheading && (
          <p
            className={cn(
              "mx-auto mt-6 max-w-2xl text-lg sm:text-xl",
              backgroundImage?.asset ? "text-white/90" : "text-brand-muted"
            )}
          >
            {subheading}
          </p>
        )}

        {cta?.label && (
          <div className="mt-10">
            <Button
              href={cta.url}
              isExternal={cta.isExternal}
              size="lg"
              variant={backgroundImage?.asset ? "primary" : "primary"}
            >
              {cta.label}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
