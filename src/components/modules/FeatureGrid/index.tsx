import Container from "@/components/ui/Container";
import type { FeatureGridProps } from "./types";

export default function FeatureGrid({ heading, features }: FeatureGridProps) {
  if (!features?.length) return null;

  return (
    <Container>
      {heading && (
        <h2 className="mb-12 text-center font-display text-3xl font-bold sm:text-4xl">
          {heading}
        </h2>
      )}

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature._key}
            className="rounded bg-brand-surface p-6 transition-shadow hover:shadow-md"
          >
            {feature.icon && (
              <span className="mb-4 block text-3xl" role="img" aria-hidden="true">
                {feature.icon}
              </span>
            )}
            <h3 className="font-display text-xl font-semibold">
              {feature.title}
            </h3>
            {feature.description && (
              <p className="mt-2 text-brand-muted">{feature.description}</p>
            )}
          </div>
        ))}
      </div>
    </Container>
  );
}
