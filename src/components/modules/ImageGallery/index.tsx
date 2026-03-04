"use client";

import { useState, useEffect, useCallback } from "react";
import Container from "@/components/ui/Container";
import SanityImage from "@/components/ui/SanityImage";
import type { ImageGalleryProps, GalleryImage } from "./types";

export default function ImageGallery({ images }: ImageGalleryProps) {
  if (!images?.length) return null;

  const columns =
    images.length === 1
      ? "grid-cols-1"
      : images.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <Container>
      <div className={`grid gap-4 ${columns}`}>
        {images.map((image, i) => (
          <GalleryThumbnail
            key={image.asset?._ref ?? i}
            image={image}
            images={images}
            index={i}
            totalCount={images.length}
          />
        ))}
      </div>
    </Container>
  );
}

function GalleryThumbnail({
  image,
  images,
  index,
  totalCount,
}: {
  image: GalleryImage;
  images: GalleryImage[];
  index: number;
  totalCount: number;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      <figure className="overflow-hidden rounded">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="relative block w-full cursor-zoom-in overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2"
          aria-label={image.alt || `View image ${index + 1} of ${totalCount}`}
        >
          <div className="relative aspect-[4/3]">
            <SanityImage
              image={image}
              fill
              sizes={
                totalCount === 1
                  ? "100vw"
                  : totalCount === 2
                    ? "(max-width: 640px) 100vw, 50vw"
                    : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              }
              className="transition-transform duration-300 hover:scale-105"
            />
          </div>
        </button>
        {image.caption && (
          <figcaption className="mt-2 text-center text-sm text-brand-muted">
            {image.caption}
          </figcaption>
        )}
      </figure>

      {lightboxOpen && (
        <Lightbox
          images={images}
          startIndex={index}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

function Lightbox({
  images,
  startIndex,
  onClose,
}: {
  images: GalleryImage[];
  startIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(startIndex);
  const image = images[current];

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
          goPrev();
          break;
      }
    }

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goNext, goPrev]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={`Image ${current + 1} of ${images.length}`}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Close lightbox"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Prev button */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={goPrev}
          className="absolute left-4 z-10 rounded-full bg-white/10 p-3 text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Previous image"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Image */}
      <div className="relative max-h-[85vh] max-w-[90vw]">
        <SanityImage
          image={image}
          width={1600}
          height={1200}
          sizes="90vw"
          priority
          className="max-h-[85vh] w-auto rounded object-contain"
        />
        {image.caption && (
          <p className="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-3 text-center text-sm text-white backdrop-blur-sm">
            {image.caption}
          </p>
        )}
      </div>

      {/* Next button */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={goNext}
          className="absolute right-4 z-10 rounded-full bg-white/10 p-3 text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Next image"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Counter */}
      {images.length > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/70">
          {current + 1} / {images.length}
        </p>
      )}
    </div>
  );
}
