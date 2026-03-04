import Container from "@/components/ui/Container";
import SanityImage from "@/components/ui/SanityImage";
import type { LogoBarProps } from "./types";

export default function LogoBar({ heading, logos }: LogoBarProps) {
  if (!logos?.length) return null;

  return (
    <Container>
      {heading && (
        <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-brand-muted">
          {heading}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
        {logos.map((logo, i) => (
          <div
            key={logo.asset?._ref ?? i}
            className="grayscale transition-all hover:grayscale-0"
          >
            <SanityImage
              image={logo}
              width={160}
              height={60}
              className="h-10 w-auto object-contain lg:h-12"
            />
          </div>
        ))}
      </div>
    </Container>
  );
}
