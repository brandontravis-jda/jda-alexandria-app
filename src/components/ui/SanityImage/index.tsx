import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import { cn } from "@/lib/utils";
import type { SanityImageProps } from "./types";

export default function SanityImage({
  image,
  width = 800,
  height = 600,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  className,
  priority = false,
  fill = false,
}: SanityImageProps) {
  if (!image?.asset) return null;

  const objectPosition = image.hotspot
    ? `${image.hotspot.x * 100}% ${image.hotspot.y * 100}%`
    : undefined;

  const src = urlFor(image).width(width).height(height).auto("format").url();

  return (
    <Image
      src={src}
      alt={image.alt || ""}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      priority={priority}
      fill={fill}
      className={cn("object-cover", className)}
      style={{ objectPosition }}
    />
  );
}
