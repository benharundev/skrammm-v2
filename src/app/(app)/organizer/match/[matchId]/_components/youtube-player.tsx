"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
import { Link2, RotateCcw } from "lucide-react";

export interface YoutubePlayerHandle {
  getCurrentTimeMs: () => number;
  seekToMs: (ms: number) => void;
}

interface YoutubePlayerProps {
  videoUrl: string | null;
  onUrlSave: (url: string) => void;
}

interface YTPlayer {
  getCurrentTime: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
}

interface YTPlayerConstructor {
  new (el: HTMLElement, options: { events?: Record<string, () => void> }): YTPlayer;
}

declare global {
  interface Window {
    YT?: { Player: YTPlayerConstructor };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

export const YoutubePlayer = forwardRef<YoutubePlayerHandle, YoutubePlayerProps>(
  function YoutubePlayer({ videoUrl, onUrlSave }, ref) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const playerRef = useRef<YTPlayer | null>(null);
    const [inputUrl, setInputUrl] = useState("");
    const videoId = videoUrl ? extractVideoId(videoUrl) : null;

    useImperativeHandle(ref, () => ({
      getCurrentTimeMs() {
        try {
          return Math.round((playerRef.current?.getCurrentTime() ?? 0) * 1000);
        } catch {
          return 0;
        }
      },
      seekToMs(ms: number) {
        try {
          playerRef.current?.seekTo(ms / 1000, true);
        } catch {
          // player not ready
        }
      },
    }));

    useEffect(() => {
      if (!videoId) return;

      function initPlayer() {
        if (!iframeRef.current) return;
        playerRef.current = new window.YT!.Player(iframeRef.current, {
          events: {
            onReady: () => {},
          },
        });
      }

      if (typeof window !== "undefined" && window.YT?.Player != null) {
        initPlayer();
        return;
      }

      if (!document.getElementById("yt-api-script")) {
        const script = document.createElement("script");
        script.id = "yt-api-script";
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
      }

      window.onYouTubeIframeAPIReady = initPlayer;
    }, [videoId]);

    if (!videoId) {
      return (
        <div className="flex flex-col gap-2 bg-card border-2 border-border rounded-sm p-4">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">YouTube URL</p>
          <div className="flex gap-2">
            <input
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && inputUrl.trim()) {
                  onUrlSave(inputUrl.trim());
                }
              }}
              placeholder="Paste YouTube URL…"
              className="flex-1 h-10 px-3 border-2 border-border bg-background rounded-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-fair-play-gold text-[13px]"
            />
            <button
              onClick={() => { if (inputUrl.trim()) onUrlSave(inputUrl.trim()); }}
              className="flex items-center gap-1.5 px-4 h-10 bg-pitch-green text-white border-2 border-pitch-green rounded-sm hover:bg-pitch-green/90 transition-colors text-[13px] font-bold"
            >
              <Link2 size={13} /> Load
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}`}
            className="absolute inset-0 w-full h-full rounded-sm border-2 border-border"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <button
          onClick={() => onUrlSave("")}
          className="flex items-center gap-1.5 self-end text-[10px] font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <RotateCcw size={9} /> Change video
        </button>
      </div>
    );
  }
);
