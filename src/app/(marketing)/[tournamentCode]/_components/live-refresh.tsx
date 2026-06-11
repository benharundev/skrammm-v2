"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface LiveRefreshProps {
  hasLiveMatches: boolean;
}

export function LiveRefresh({ hasLiveMatches }: LiveRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    if (!hasLiveMatches) return;
    const interval = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(interval);
  }, [hasLiveMatches, router]);

  return null;
}
