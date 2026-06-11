"use client";

import { cn } from "@/lib/utils";

interface ReliabilityRingProps {
  score: number;
  size?: number;
  className?: string;
}

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function scoreColor(s: number) {
  if (s >= 80) return "#ffba20";
  if (s >= 60) return "#4f5f77";
  return "#ba1a1a";
}

function scoreLabel(s: number) {
  if (s >= 80) return "Elite";
  if (s >= 60) return "Reliable";
  if (s >= 40) return "Building";
  return "At Risk";
}

export function ReliabilityRing({ score, size = 120, className }: ReliabilityRingProps) {
  const s = Math.max(0, Math.min(100, score));
  const offset = CIRCUMFERENCE - (s / 100) * CIRCUMFERENCE;
  const color = scoreColor(s);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="butt"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="relative flex flex-col items-center gap-0.5">
        <span
          className="font-[family-name:var(--font-lexend)] font-black leading-none"
          style={{ fontSize: size * 0.27, color }}
        >
          {s}
        </span>
        <span
          className="uppercase tracking-widest text-muted-foreground"
          style={{ fontSize: size * 0.09 }}
        >
          {scoreLabel(s)}
        </span>
      </div>
    </div>
  );
}
