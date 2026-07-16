"use client";

import { useRef } from "react";
import { Play } from "lucide-react";
import { PitchSvg } from "./pitch-svg";
import { YoutubePlayer, type YoutubePlayerHandle } from "./youtube-player";
import type { PitchPin } from "./pitch-svg";
import { ANALYST_SHORTCUT_LABELS } from "../_lib/analyst-shortcuts";
import { EVENT_CONFIG, STAT_CONFIG } from "@/app/(app)/organizer/_lib/event-config";

interface TaggedEvent {
  id: string;
  eventType: string;
  team: "home" | "away";
  label: string;
  colorClass: string;
  pitchX: number;
  pitchY: number;
  videoTimestampMs: number;
}

interface AnalystPanelProps {
  videoUrl: string | null;
  activeAction: { eventType: string; team: "home" | "away" } | null;
  pins: PitchPin[];
  taggedEvents: TaggedEvent[];
  activeTeam: "home" | "away";
  homeShort: string;
  awayShort: string;
  onPitchClick: (coords: { pitchX: number; pitchY: number }, videoTimestampMs: number) => void;
  onUrlSave: (url: string) => void;
}

function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getEventLabel(eventType: string): { label: string; colorClass: string } {
  if (eventType in EVENT_CONFIG) {
    const cfg = EVENT_CONFIG[eventType as keyof typeof EVENT_CONFIG];
    return { label: cfg.label, colorClass: cfg.colorClass };
  }
  if (eventType in STAT_CONFIG) {
    const cfg = STAT_CONFIG[eventType as keyof typeof STAT_CONFIG];
    return { label: cfg.label, colorClass: "bg-navy/60 text-white" };
  }
  return { label: eventType.toUpperCase().slice(0, 4), colorClass: "bg-muted text-foreground" };
}

const SHORTCUT_GROUPS = [
  { label: "Scoring", keys: ["T", "C", "P", "D", "Y", "R"] },
  { label: "Kick/Pass/Run", keys: ["K", "A", "N", "M"] },
  { label: "Attacking", keys: ["Q", "G", "B", "V", "O", "W", "L", "J", "H", "U"] },
  { label: "Defensive", keys: ["E", "X"] },
  { label: "Set Pieces", keys: ["1", "2", "3", "4"] },
  { label: "Discipline", keys: ["S", "F", "Z"] },
];

const KEY_TO_ACTION: Record<string, string> = Object.fromEntries(
  Object.entries(ANALYST_SHORTCUT_LABELS).map(([eventType, key]) => [key, eventType])
);

export function AnalystPanel({
  videoUrl,
  activeAction,
  pins,
  taggedEvents,
  activeTeam,
  homeShort,
  awayShort,
  onPitchClick,
  onUrlSave,
}: AnalystPanelProps) {
  const playerRef = useRef<YoutubePlayerHandle>(null);

  function handlePitchClick(coords: { pitchX: number; pitchY: number }) {
    const ms = playerRef.current?.getCurrentTimeMs() ?? 0;
    onPitchClick(coords, ms);
  }

  const activeActionLabel = activeAction
    ? (() => {
        const { label } = getEventLabel(activeAction.eventType);
        const key = ANALYST_SHORTCUT_LABELS[activeAction.eventType] ?? "?";
        return `${label} [${key}] · ${activeAction.team === "home" ? homeShort : awayShort}`;
      })()
    : "";

  return (
    <div className="flex flex-col gap-3 bg-card border-2 border-navy rounded-sm p-4 shadow-brutalist-navy">

      {/* Team indicator */}
      <div className="flex items-center gap-2 text-[11px] font-bold">
        <span className="text-muted-foreground uppercase tracking-wide">Active team:</span>
        <div className="flex gap-1">
          <span className={`px-2 py-0.5 rounded-sm border-2 ${activeTeam === "home" ? "border-pitch-green bg-pitch-green text-white" : "border-border text-muted-foreground"}`}>
            [{homeShort}]
          </span>
          <span className={`px-2 py-0.5 rounded-sm border-2 ${activeTeam === "away" ? "border-pitch-green bg-pitch-green text-white" : "border-border text-muted-foreground"}`}>
            ]{awayShort}[
          </span>
        </div>
        <span className="text-muted-foreground/50 ml-auto text-[10px]">
          [ = home · ] = away · ESC = cancel
        </span>
      </div>

      {/* YouTube player */}
      <YoutubePlayer ref={playerRef} videoUrl={videoUrl} onUrlSave={onUrlSave} />

      {/* Pitch + shortcut reference */}
      <div className="grid grid-cols-[3fr_2fr] gap-3">
        <PitchSvg
          activeAction={activeAction}
          activeActionLabel={activeActionLabel}
          pins={pins}
          onPitchClick={handlePitchClick}
        />

        {/* Shortcut reference */}
        <div className="flex flex-col gap-2 overflow-y-auto max-h-52">
          {SHORTCUT_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[8px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-1">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-1">
                {group.keys.map(key => {
                  const eventType = KEY_TO_ACTION[key] ?? "";
                  const { label, colorClass } = getEventLabel(eventType);
                  const isActive = activeAction?.eventType === eventType;
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between gap-1 px-1.5 py-1 rounded-sm border text-[9px] transition-colors ${
                        isActive
                          ? "border-fair-play-gold bg-fair-play-gold/10"
                          : "border-border bg-muted/20"
                      }`}
                    >
                      <span className={`px-1 rounded-sm font-black text-[8px] ${colorClass}`}>{label}</span>
                      <kbd className="bg-background border border-border rounded px-1 text-[9px] font-mono text-muted-foreground">
                        {key}
                      </kbd>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tagged events log */}
      {taggedEvents.length > 0 && (
        <div className="border-t-2 border-border pt-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
            Tagged Events — {taggedEvents.length}
          </p>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
            {taggedEvents.map(ev => (
              <div key={ev.id} className="flex items-center gap-2 text-[11px]">
                <button
                  onClick={() => playerRef.current?.seekToMs(ev.videoTimestampMs)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-fair-play-gold transition-colors flex-shrink-0 font-mono"
                  title="Jump to timestamp"
                >
                  <Play size={9} />
                  {formatTimestamp(ev.videoTimestampMs)}
                </button>
                <span className={`px-1.5 py-0.5 rounded-sm font-black text-[9px] flex-shrink-0 ${ev.colorClass}`}>
                  {ev.label}
                </span>
                <span className="text-muted-foreground text-[10px] flex-shrink-0">
                  {ev.team === "home" ? homeShort : awayShort}
                </span>
                <span className="text-muted-foreground/40 text-[9px] ml-auto font-mono">
                  ⊙ {ev.pitchX.toFixed(0)},{ev.pitchY.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
