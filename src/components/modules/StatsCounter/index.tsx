"use client";

import { useEffect, useRef, useState } from "react";
import Container from "@/components/ui/Container";
import type { StatsCounterProps, Stat } from "./types";

export default function StatsCounter({ stats }: StatsCounterProps) {
  if (!stats?.length) return null;

  return (
    <Container>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <AnimatedStat key={stat._key} stat={stat} />
        ))}
      </div>
    </Container>
  );
}

function AnimatedStat({ stat }: { stat: Stat }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animateCount(stat.number, 2000);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [stat.number, hasAnimated]);

  function animateCount(target: number, duration: number) {
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const displayValue = `${stat.prefix ?? ""}${count.toLocaleString()}${stat.suffix ?? ""}`;
  const finalValue = `${stat.prefix ?? ""}${stat.number.toLocaleString()}${stat.suffix ?? ""}`;

  return (
    <div ref={ref} className="text-center">
      <p className="font-display text-4xl font-bold text-brand-text-heading sm:text-5xl" aria-hidden="true">
        {displayValue}
      </p>
      <p className="sr-only" aria-live="polite">
        {finalValue} {stat.label}
      </p>
      <p className="mt-2 text-brand-muted">{stat.label}</p>
    </div>
  );
}
