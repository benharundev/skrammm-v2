"use client";
import { useEffect, useState } from "react";

export function computeMinute(
  startedAt: Date | null,
  secondHalfStartedAt: Date | null,
  now = Date.now()
): number {
  if (!startedAt) return 0;
  if (secondHalfStartedAt) {
    return 40 + Math.floor((now - secondHalfStartedAt.getTime()) / 60_000);
  }
  return Math.floor((now - startedAt.getTime()) / 60_000);
}

// totalPausedMs is subtracted from the effective "now" so the clock only
// advances during active play. When pausedAt is set, the clock freezes at
// the moment the pause started (minus any prior accumulated pause time).
export function useLiveClock(
  startedAt: Date | null,
  secondHalfStartedAt: Date | null,
  isLive: boolean,
  pausedAt: Date | null,
  totalPausedMs: number
): number {
  const [minute, setMinute] = useState(() => {
    const effectiveNow = pausedAt
      ? pausedAt.getTime() - totalPausedMs
      : Date.now() - totalPausedMs;
    return computeMinute(startedAt, secondHalfStartedAt, effectiveNow);
  });

  useEffect(() => {
    const effectiveNow = pausedAt
      ? pausedAt.getTime() - totalPausedMs
      : Date.now() - totalPausedMs;
    setMinute(computeMinute(startedAt, secondHalfStartedAt, effectiveNow));
    if (!isLive) return;
    const id = setInterval(() => {
      setMinute(computeMinute(startedAt, secondHalfStartedAt, Date.now() - totalPausedMs));
    }, 1_000);
    return () => clearInterval(id);
  }, [startedAt, secondHalfStartedAt, isLive, pausedAt, totalPausedMs]);

  return minute;
}
