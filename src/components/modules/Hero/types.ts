import type { SanityImageSource } from "@/components/ui/SanityImage/types";

export interface HeroLink {
  label: string;
  url: string;
  isExternal?: boolean;
}

export interface HeroProps {
  _type: "hero";
  _key: string;
  heading: string;
  subheading?: string;
  cta?: HeroLink;
  backgroundImage?: SanityImageSource;
}
