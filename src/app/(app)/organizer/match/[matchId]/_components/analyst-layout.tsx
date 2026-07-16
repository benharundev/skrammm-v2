"use client";

import { useRef, useState } from "react";
import { Check, Play, X } from "lucide-react";
import { PitchSvg, type PitchPin } from "./pitch-svg";
import { YoutubePlayer, type YoutubePlayerHandle } from "./youtube-player";
import { ANALYST_SHORTCUT_LABELS } from "../_lib/analyst-shortcuts";
import {
  EVENT_CONFIG,
  STAT_CONFIG,
  type StatType,
} from "@/app/(app)/organizer/_lib/event-config";

// ── Types ─────────────────────────────────────────────────────────────────────

type StatsMap = Record<StatType, number>;

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

interface RosterPlayer {
  id: string;
  number: number;
  name: string;
  position: string;
}

interface PendingAction {
  team: "home" | "away";
  type: keyof typeof EVENT_CONFIG;
  playerName: string;
  playerId: string | null;
  pitchX?: number;
  pitchY?: number;
  videoTimestampMs?: number;
}

interface AnalystLayoutProps {
  videoUrl: string | null;
  activeAction: { eventType: string; team: "home" | "away" } | null;
  activeTeam: "home" | "away";
  pins: PitchPin[];
  analystTags: TaggedEvent[];
  homeStats: StatsMap;
  awayStats: StatsMap;
  canScore: boolean;
  homeShort: string;
  awayShort: string;
  homeTeamName: string;
  awayTeamName: string;
  pendingAction: PendingAction | null;
  homeRoster: RosterPlayer[];
  awayRoster: RosterPlayer[];
  onTeamChange: (team: "home" | "away") => void;
  onPitchClick: (coords: { pitchX: number; pitchY: number }, videoTimestampMs: number) => void;
  onUrlSave: (url: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onPlayerSelect: (playerId: string | null, playerName: string) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

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
    const cfg = STAT_CONFIG[eventType as StatType];
    return { label: cfg.label, colorClass: "bg-navy/60 text-white" };
  }
  return { label: eventType.toUpperCase().slice(0, 4), colorClass: "bg-muted text-foreground" };
}

const KEY_TO_ACTION: Record<string, string> = Object.fromEntries(
  Object.entries(ANALYST_SHORTCUT_LABELS).map(([eventType, key]) => [key, eventType]),
);

// Shortcut strip groups — abbreviated single-row reminders.
type ChipTone = "scoring" | "stat" | "discipline";
const SHORTCUT_STRIP: { tone: ChipTone; keys: string[] }[] = [
  { tone: "scoring", keys: ["T", "C", "P", "D"] },
  { tone: "discipline", keys: ["Y", "R", "S", "F", "Z"] },
  {
    tone: "stat",
    keys: [
      "K", "A", "N", "M", "Q", "G", "B", "V", "O",
      "W", "L", "J", "H", "U", "E", "X", "1", "2", "3", "4",
    ],
  },
];

const TONE_CLASS: Record<ChipTone, string> = {
  scoring: "bg-fair-play-gold/15 border-fair-play-gold/40",
  stat: "bg-navy/10 border-navy/30",
  discipline: "bg-amber-500/10 border-amber-500/40",
};

// Compact live-stats rows: label + which StatType to read for each side.
const COMPACT_STATS: { label: string; stat: StatType }[] = [
  { label: "Tackles Made", stat: "tackles_made" },
  { label: "Tackles Miss", stat: "tackles_missed" },
  { label: "Rucks Won", stat: "rucks_won" },
  { label: "Rucks Lost", stat: "rucks_lost" },
  { label: "Mauls Won", stat: "mauls_won" },
  { label: "Mauls Lost", stat: "mauls_lost" },
  { label: "Clean Breaks", stat: "clean_breaks" },
  { label: "Kicks", stat: "kicks_from_hand" },
  { label: "Passes", stat: "passes" },
  { label: "Metres Run", stat: "metres_run" },
];

// ── Player dropdown (compact, for the pending-action overlay) ─────────────────

function PlayerDropdown({
  roster,
  value,
  onChange,
  placeholder,
}: {
  roster: RosterPlayer[];
  value: string;
  onChange: (playerId: string | null, playerName: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const display = value || placeholder;

  if (roster.length === 0) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(null, e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-sm border-2 border-border bg-card px-4 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-fair-play-gold"
      />
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        type="button"
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-sm border-2 bg-card px-4 text-left text-[13px] transition-colors ${
          open ? "border-fair-play-gold" : "border-border hover:border-navy"
        } ${value ? "font-semibold text-foreground" : "font-normal text-muted-foreground"}`}
      >
        <span className="truncate">{display}</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-sm border-2 border-border bg-card shadow-brutalist-navy">
          <button
            onClick={() => {
              onChange(null, "");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 border-b border-border px-4 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50"
          >
            Unknown player
          </button>
          {roster.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onChange(p.id, p.name);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-muted/50"
            >
              <span className="flex h-5 w-7 flex-shrink-0 items-center justify-center rounded-sm bg-pitch-green font-[family-name:var(--font-lexend)] text-[10px] font-extrabold text-white">
                {p.number}
              </span>
              <span className="truncate font-medium text-foreground">{p.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{p.position}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AnalystLayout({
  videoUrl,
  activeAction,
  activeTeam,
  pins,
  analystTags,
  homeStats,
  awayStats,
  canScore,
  homeShort,
  awayShort,
  homeTeamName: _homeTeamName,
  awayTeamName: _awayTeamName,
  pendingAction,
  homeRoster,
  awayRoster,
  onTeamChange,
  onPitchClick,
  onUrlSave,
  onConfirm,
  onCancel,
  onPlayerSelect,
}: AnalystLayoutProps) {
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

  const pendingRoster = pendingAction?.team === "home" ? homeRoster : awayRoster;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* ── Team bar ──────────────────────────────────────────────────── */}
      <div className="flex h-10 flex-shrink-0 items-center gap-2 border-b-2 border-border bg-card px-3">
        <div className="flex gap-1.5">
          {(["home", "away"] as const).map((side) => {
            const active = activeTeam === side;
            return (
              <button
                key={side}
                type="button"
                onClick={() => onTeamChange(side)}
                className={`rounded-sm border-2 px-3 py-0.5 text-[11px] font-black tracking-wide transition-colors ${
                  active
                    ? "border-pitch-green bg-pitch-green text-white"
                    : "border-border text-muted-foreground hover:border-navy"
                }`}
              >
                [ {side === "home" ? homeShort : awayShort} ]
              </button>
            );
          })}
        </div>
        {activeAction && (
          <span className="rounded-sm bg-fair-play-gold px-2 py-0.5 text-[10px] font-black text-pitch-green">
            {activeActionLabel} — click pitch
          </span>
        )}
        <span className="ml-auto text-[10px] font-medium text-muted-foreground/70">
          [ = home · ] = away · ESC to cancel
        </span>
      </div>

      {/* ── Video + Pitch row ─────────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-0 border-b-2 border-border">
        <div className="flex min-h-0 items-center justify-center overflow-hidden border-r-2 border-border bg-background p-2">
          <div className="w-full">
            <YoutubePlayer ref={playerRef} videoUrl={videoUrl} onUrlSave={onUrlSave} />
          </div>
        </div>
        <div className="flex min-h-0 items-center justify-center overflow-hidden bg-background p-2">
          <div className="w-full">
            <PitchSvg
              activeAction={activeAction}
              activeActionLabel={activeActionLabel}
              pins={pins}
              onPitchClick={handlePitchClick}
              showHeatmap={pins.length > 0}
            />
          </div>
        </div>
      </div>

      {/* ── Shortcut strip ────────────────────────────────────────────── */}
      <div className="flex h-11 flex-shrink-0 items-center gap-2 overflow-x-auto border-b-2 border-border bg-card px-3">
        {SHORTCUT_STRIP.map((group) => (
          <div key={group.tone} className="flex flex-shrink-0 items-center gap-1">
            {group.keys.map((key) => {
              const eventType = KEY_TO_ACTION[key] ?? "";
              const { label } = getEventLabel(eventType);
              const isActive = activeAction?.eventType === eventType;
              return (
                <span
                  key={key}
                  className={`flex flex-shrink-0 items-center gap-1 rounded-sm border px-1.5 py-1 text-[9px] transition-colors ${
                    isActive ? "border-fair-play-gold bg-fair-play-gold/20" : TONE_CLASS[group.tone]
                  }`}
                >
                  <kbd className="rounded border border-border bg-background px-1 font-mono text-[9px] text-foreground">
                    {key}
                  </kbd>
                  <span className="font-bold text-foreground">{label}</span>
                </span>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Live report ───────────────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-[3fr_2fr] gap-0 overflow-hidden">
        {/* Compact stats table */}
        <div className="min-h-0 overflow-y-auto border-r-2 border-border p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Live Stats — {homeShort} vs {awayShort}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {COMPACT_STATS.map(({ label, stat }) => {
              const homeVal = homeStats[stat];
              const awayVal = awayStats[stat];
              const suffix = stat === "metres_run" ? "m" : "";
              return (
                <div
                  key={stat}
                  className="flex items-center justify-between gap-2 rounded-sm border border-border bg-card px-2 py-1"
                >
                  <span className="truncate text-[10px] font-medium text-muted-foreground">
                    {label}
                  </span>
                  <span className="flex-shrink-0 font-[family-name:var(--font-lexend)] text-[11px] font-black tabular-nums text-foreground">
                    <span className="text-pitch-green">
                      {homeVal}
                      {suffix}
                    </span>
                    <span className="mx-1 text-muted-foreground/40">|</span>
                    <span className="text-navy">
                      {awayVal}
                      {suffix}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tagged events log */}
        <div className="min-h-0 overflow-y-auto p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Tagged Events — {analystTags.length}
          </p>
          {analystTags.length === 0 ? (
            <p className="py-4 text-center text-[11px] italic text-muted-foreground">
              No tags yet
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {analystTags.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 text-[11px]">
                  <button
                    onClick={() => playerRef.current?.seekToMs(ev.videoTimestampMs)}
                    className="flex flex-shrink-0 items-center gap-1 font-mono text-muted-foreground transition-colors hover:text-fair-play-gold"
                    title="Jump to timestamp"
                  >
                    <Play size={9} />
                    {formatTimestamp(ev.videoTimestampMs)}
                  </button>
                  <span className={`flex-shrink-0 rounded-sm px-1.5 py-0.5 text-[9px] font-black ${ev.colorClass}`}>
                    {ev.label}
                  </span>
                  <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                    {ev.team === "home" ? homeShort : awayShort}
                  </span>
                  <span className="ml-auto flex-shrink-0 font-mono text-[9px] text-muted-foreground/40">
                    ⊙ {ev.pitchX.toFixed(0)},{ev.pitchY.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Pending-action overlay (player selection + confirm) ───────── */}
      {pendingAction && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-sm flex-col gap-3 rounded-sm border-2 border-fair-play-gold bg-card p-4 shadow-brutalist-navy">
            <div className="flex items-center gap-2">
              <span className={`rounded-sm px-2 py-0.5 text-xs font-black ${EVENT_CONFIG[pendingAction.type].colorClass}`}>
                {EVENT_CONFIG[pendingAction.type].label}
              </span>
              <span className="text-[13px] font-bold text-foreground">
                {pendingAction.type === "yellow_card" || pendingAction.type === "red_card"
                  ? "Who received?"
                  : "Who scored?"}
              </span>
              <span className="ml-auto text-[11px] font-bold text-muted-foreground">
                {pendingAction.team === "home" ? homeShort : awayShort}
              </span>
            </div>
            <PlayerDropdown
              roster={pendingRoster}
              value={pendingAction.playerName}
              onChange={onPlayerSelect}
              placeholder="Select or type player…"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={onConfirm}
                disabled={!canScore}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-sm border-2 border-pitch-green bg-pitch-green text-[13px] font-bold text-white transition-colors hover:bg-pitch-green/90 disabled:opacity-40 shadow-brutalist-navy-xs"
              >
                <Check size={14} /> Confirm
              </button>
              <button
                onClick={onCancel}
                className="flex h-10 items-center rounded-sm border-2 border-border px-4 text-[13px] text-muted-foreground transition-colors hover:border-navy"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
