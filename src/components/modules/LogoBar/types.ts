import type { SanityImageSource } from "@/components/ui/SanityImage/types";

export interface LogoBarProps {
  _type: "logoBar";
  _key: string;
  heading?: string;
  logos: SanityImageSource[];
}
