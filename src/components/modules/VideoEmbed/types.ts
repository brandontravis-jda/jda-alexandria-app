import type { SanityImageSource } from "@/components/ui/SanityImage/types";

export interface VideoEmbedProps {
  _type: "videoEmbed";
  _key: string;
  url: string;
  poster?: SanityImageSource;
}
