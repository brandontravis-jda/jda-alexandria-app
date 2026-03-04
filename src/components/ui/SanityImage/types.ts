export interface SanityImageSource {
  _type: "image";
  asset: {
    _ref: string;
    _type: "reference";
  };
  hotspot?: {
    x: number;
    y: number;
    height: number;
    width: number;
  };
  crop?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  alt: string;
}

export interface SanityImageProps {
  image: SanityImageSource;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
  fill?: boolean;
}
