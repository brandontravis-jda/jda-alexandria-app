import type { SanityImageSource } from "@/components/ui/SanityImage/types";

export interface Testimonial {
  _key: string;
  quote: string;
  name: string;
  title?: string;
  photo?: SanityImageSource;
}

export interface TestimonialsProps {
  _type: "testimonials";
  _key: string;
  heading?: string;
  layout?: "grid" | "carousel";
  items: Testimonial[];
}
