"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import Container from "@/components/ui/Container";
import SanityImage from "@/components/ui/SanityImage";
import type { TestimonialsProps, Testimonial } from "./types";

export default function Testimonials({
  heading,
  layout = "grid",
  items,
}: TestimonialsProps) {
  if (!items?.length) return null;

  return (
    <Container>
      {heading && (
        <h2 className="mb-12 text-center font-display text-3xl font-bold sm:text-4xl">
          {heading}
        </h2>
      )}

      {layout === "carousel" ? (
        <TestimonialCarousel items={items} />
      ) : (
        <TestimonialGrid items={items} />
      )}
    </Container>
  );
}

function TestimonialGrid({ items }: { items: Testimonial[] }) {
  const columns =
    items.length === 1
      ? "max-w-2xl mx-auto"
      : items.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid gap-8 ${columns}`}>
      {items.map((item) => (
        <TestimonialCard key={item._key} item={item} />
      ))}
    </div>
  );
}

function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
  }, []);

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  }, [items.length]);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  }, [items.length]);

  useEffect(() => {
    intervalRef.current = setInterval(goNext, 6000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [goNext]);

  const pauseAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const resumeAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(goNext, 6000);
  }, [goNext]);

  return (
    <div
      className="relative mx-auto max-w-3xl"
      onMouseEnter={pauseAutoplay}
      onMouseLeave={resumeAutoplay}
      onFocus={pauseAutoplay}
      onBlur={resumeAutoplay}
      role="region"
      aria-roledescription="carousel"
      aria-label="Testimonials"
    >
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {items.map((item, i) => (
            <div
              key={item._key}
              className="w-full shrink-0 px-4"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${items.length}`}
              aria-hidden={i !== current}
            >
              <TestimonialCard item={item} centered />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-0 top-1/2 -translate-x-2 -translate-y-1/2 rounded-full bg-brand-surface p-2 shadow transition-colors hover:bg-brand-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary"
            aria-label="Previous testimonial"
          >
            <svg className="h-5 w-5 text-brand-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 rounded-full bg-brand-surface p-2 shadow transition-colors hover:bg-brand-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary"
            aria-label="Next testimonial"
          >
            <svg className="h-5 w-5 text-brand-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="mt-8 flex justify-center gap-2" role="tablist" aria-label="Testimonial slides">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to testimonial ${i + 1}`}
              onClick={() => goTo(i)}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2",
                i === current ? "bg-brand-secondary" : "bg-brand-border hover:bg-brand-muted"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TestimonialCard({
  item,
  centered,
}: {
  item: Testimonial;
  centered?: boolean;
}) {
  return (
    <blockquote
      className={cn(
        "flex flex-col rounded bg-brand-surface p-6",
        centered && "text-center"
      )}
    >
      <svg
        className={cn(
          "mb-4 h-8 w-8 text-brand-secondary/30",
          centered && "mx-auto"
        )}
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
      </svg>

      <p className="flex-1 text-brand-text">{item.quote}</p>

      <footer className={cn("mt-6 flex items-center gap-3", centered && "justify-center")}>
        {item.photo?.asset && (
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
            <SanityImage
              image={item.photo}
              width={80}
              height={80}
              className="h-full w-full"
            />
          </div>
        )}
        <div className={centered ? "text-left" : undefined}>
          <cite className="not-italic font-semibold text-brand-text-heading">
            {item.name}
          </cite>
          {item.title && (
            <p className="text-sm text-brand-muted">{item.title}</p>
          )}
        </div>
      </footer>
    </blockquote>
  );
}
