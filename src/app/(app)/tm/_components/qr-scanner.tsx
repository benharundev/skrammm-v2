"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { Loader2, CameraOff } from "lucide-react";

interface QrScannerProps {
  onScan: (token: string) => void;
  active: boolean;
}

export function QrScanner({ onScan, active }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }
    if (!videoRef.current) return;
    setLoading(true);
    setError(null);
    const reader = new BrowserQRCodeReader();
    const video = videoRef.current;
    reader
      .decodeFromVideoDevice(undefined, video, (result, err, controls) => {
        setLoading(false);
        controlsRef.current = controls;
        if (result) {
          const text = result.getText();
          const m = /^skrammm:attend:(.+)$/.exec(text);
          const token = m?.[1];
          if (token) onScan(token);
        }
        if (err && err.name !== "NotFoundException") setError("Camera error. Check permissions.");
      })
      .catch(() => { setLoading(false); setError("Could not access camera."); });
    return () => { controlsRef.current?.stop(); controlsRef.current = null; };
  }, [active, onScan]);

  return (
    <div className="relative overflow-hidden rounded-sm border-2 border-border bg-black" style={{ aspectRatio: "4/3" }}>
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 p-4 text-center">
          <CameraOff className="h-8 w-8 text-destructive" />
          <p className="text-sm text-white">{error}</p>
        </div>
      )}
      {active && !loading && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-48 w-48 rounded-sm border-4 border-accent/80" />
        </div>
      )}
    </div>
  );
}
