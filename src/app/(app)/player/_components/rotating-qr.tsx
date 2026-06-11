"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Loader2 } from "lucide-react";

const ROTATE_INTERVAL = 55_000; // refresh 5s before expiry

export function RotatingQr() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await fetch("/player/qr/token");
        if (!res.ok) {
          setError(true);
          return;
        }
        const { token, expiresAt } = (await res.json()) as {
          token: string;
          expiresAt: string;
        };
        const dataUrl = await QRCode.toDataURL(`skrammm:attend:${token}`, {
          width: 280,
          margin: 2,
          color: { dark: "#00241a", light: "#ffffff" },
        });
        setQrDataUrl(dataUrl);
        setError(false);

        // Calculate seconds until expiry
        const ms = new Date(expiresAt).getTime() - Date.now();
        setSecondsLeft(Math.max(0, Math.round(ms / 1000)));

        // Countdown ticker
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
          setSecondsLeft((s) => Math.max(0, s - 1));
        }, 1000);
      } catch {
        setError(true);
      }
    }

    void fetchToken();
    timerRef.current = setInterval(() => {
      void fetchToken();
    }, ROTATE_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const pct = secondsLeft / 60;
  const RADIUS = 130;
  const CIRC = 2 * Math.PI * RADIUS;
  const dash = CIRC * pct;

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Could not generate QR. Refresh to try again.
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative flex items-center justify-center"
        style={{ width: 300, height: 300 }}
      >
        {/* Countdown ring */}
        <svg
          width={300}
          height={300}
          viewBox="0 0 300 300"
          className="absolute inset-0 -rotate-90"
          aria-hidden="true"
        >
          <circle cx="150" cy="150" r={RADIUS} fill="none" stroke="#e5e7eb" strokeWidth="6" />
          <circle
            cx="150"
            cy="150"
            r={RADIUS}
            fill="none"
            stroke={secondsLeft > 15 ? "#ffba20" : "#ba1a1a"}
            strokeWidth="6"
            strokeLinecap="butt"
            strokeDasharray={`${dash} ${CIRC}`}
            style={{ transition: "stroke-dasharray 1s linear, stroke 0.3s ease" }}
          />
        </svg>
        {/* QR inside ring */}
        <div
          className="relative rounded-sm border-4 border-primary p-2 shadow-brutalist-green"
          style={{ width: 244, height: 244 }}
        >
          <img
            src={qrDataUrl}
            alt="Match-day attendance QR code"
            width={228}
            height={228}
            className="block"
          />
        </div>
      </div>

      {/* Countdown label */}
      <div className="text-center">
        <p
          className="font-[family-name:var(--font-lexend)] text-3xl font-black"
          style={{
            color: secondsLeft > 15 ? "hsl(var(--accent))" : "hsl(var(--destructive))",
          }}
        >
          {String(secondsLeft).padStart(2, "0")}s
        </p>
        <p className="mt-0.5 text-xs uppercase tracking-widest text-muted-foreground">
          {secondsLeft > 15 ? "Refreshes automatically" : "Refreshing soon…"}
        </p>
      </div>
    </div>
  );
}
