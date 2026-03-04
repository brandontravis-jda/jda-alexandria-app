"use client";

import { useState } from "react";
import Container from "@/components/ui/Container";
import SanityImage from "@/components/ui/SanityImage";
import type { VideoEmbedProps } from "./types";

function getEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // YouTube
    if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
      const videoId =
        parsed.hostname.includes("youtu.be")
          ? parsed.pathname.slice(1)
          : parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}`;
    }

    // Vimeo
    if (parsed.hostname.includes("vimeo.com")) {
      const match = parsed.pathname.match(/\/(\d+)/);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
    }
  } catch {
    // invalid URL
  }
  return null;
}

export default function VideoEmbed({ url, poster }: VideoEmbedProps) {
  const [loaded, setLoaded] = useState(false);
  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) return null;

  return (
    <Container>
      <div className="relative aspect-video overflow-hidden rounded">
        {!loaded && poster?.asset ? (
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="group relative h-full w-full"
            aria-label="Play video"
          >
            <SanityImage
              image={poster}
              fill
              sizes="100vw"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
              <svg
                className="h-16 w-16 text-white drop-shadow-lg"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        ) : (
          <iframe
            src={`${embedUrl}?autoplay=${loaded ? 1 : 0}`}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Embedded video"
          />
        )}
      </div>
    </Container>
  );
}
