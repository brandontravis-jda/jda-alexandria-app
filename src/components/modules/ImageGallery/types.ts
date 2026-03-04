import type { SanityImageSource } from "@/components/ui/SanityImage/types";

export interface GalleryImage extends SanityImageSource {
  caption?: string;
}

export interface ImageGalleryProps {
  _type: "imageGallery";
  _key: string;
  images: GalleryImage[];
}
