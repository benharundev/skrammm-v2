"use client";

import Link from "next/link";
import { ArrowLeft, FileText, Clock, MapPin, User } from "lucide-react";
import { EVENT_CONFIG, STAT_CONFIG, STAT_GROUPS } from "@/app/(app)/organizer/_lib/event-config";

const PHASE_LABELS: Record<string, string> = {
  scheduled: "Upcoming",
  live: "Live",
  completed: "Completed",
  locked: "Locked",
};

const SCORING_ROWS = [
  { type: "try",        label: "Tries",         pts: 5 },
  { type: "conversion", label: "Conversions",   pts: 2 },
  { type: "penalty",    label: "Penalties",     pts: 3 },
  { type: "drop_goal",  label: "Drop Goals",    pts: 3 },
  { type: "yellow_card",label: "Yellow Cards",  pts: 0 },
  { type: "red_card",   label: "Red Cards",     pts: 0 },
] as const;

export interface NormalizedEvent {
  id: string;
  minute: number;
  isHome: boolean;
  type: keyof typeof EVENT_CONFIG;
  playerName: string;
  points: number;
}

export interface StatEvent {
  id: string;
  isHome: boolean;
  statType: keyof typeof STAT_CONFIG;
}

export interface MatchReportProps {
  matchId: string;
  status: "scheduled" | "live" | "suspended" | "locked" | "completed";
  homeScore: number;
  awayScore: number;
  group: string;
  venue: string | null;
  referee: string | null;
  scheduledTime: string;
  homeName: string;
  awayName: string;
  homeShort: string;
  awayShort: string;
  events: NormalizedEvent[];
  statEvents: StatEvent[];
}

type ScorerEntry = { name: string; pts: number; labels: string[] };

function buildScorers(evs: NormalizedEvent[], isHome: boolean): ScorerEntry[] {
  const map = new Map<string, ScorerEntry>();
  for (const e of evs) {
    if (e.isHome !== isHome || e.points === 0) continue;
    const existing = map.get(e.playerName);
    const entry = existing ?? { name: e.playerName, pts: 0, labels: [] };
    entry.pts += e.points;
    entry.labels.push(EVENT_CONFIG[e.type]!.label);
    map.set(e.playerName, entry);
  }
  return [...map.values()].sort((a, b) => b.pts - a.pts);
}

export function MatchReportClient({
  matchId,
  status,
  homeScore,
  awayScore,
  group,
  venue,
  referee,
  scheduledTime,
  homeName,
  awayName,
  homeShort,
  awayShort,
  events,
  statEvents,
}: MatchReportProps) {
  const activeRows = SCORING_ROWS.filter(row => {
    const h = events.filter(e => e.isHome && e.type === row.type).length;
    const a = events.filter(e => !e.isHome && e.type === row.type).length;
    return h + a > 0;
  });

  const hasStatEvents = statEvents.length > 0;

  const homeScorers = buildScorers(events, true);
  const awayScorers = buildScorers(events, false);
  const hasScorers = homeScorers.length > 0 || awayScorers.length > 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-pitch-green border-b-2 border-navy px-5 py-3 flex items-center gap-3 flex-shrink-0">
        <Link href="/organizer/schedule"
          className="h-8 w-8 border-2 border-white/30 rounded-sm flex items-center justify-center text-white hover:border-white hover:bg-white/10 transition-colors flex-shrink-0">
          <ArrowLeft size={14} />
        </Link>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/70 text-xs">Group {group}</span>
            {venue && (
              <span className="flex items-center gap-1 text-white/60 text-xs"><MapPin size={10} />{venue}</span>
            )}
            {referee && (
              <span className="flex items-center gap-1 text-white/60 text-xs"><User size={10} />{referee}</span>
            )}
            <span className="flex items-center gap-1 text-white/60 text-xs"><Clock size={10} />{scheduledTime}</span>
          </div>
          <p className="text-white text-sm font-bold truncate font-[family-name:var(--font-lexend)]">
            {homeName} vs {awayName}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-sm border-2 flex-shrink-0 text-xs font-bold ${
          status === "live" ? "border-fair-play-gold bg-fair-play-gold/20 text-fair-play-gold animate-pulse"
          : status === "completed" || status === "locked" ? "border-white/40 bg-white/10 text-white"
          : "border-white/20 bg-white/5 text-white/60"
        }`}>
          {PHASE_LABELS[status] ?? status}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Score strip */}
        <div className="bg-pitch-green/95 border-b-2 border-navy px-5 py-5">
          <div className="flex items-center justify-center gap-6 max-w-lg mx-auto">
            <div className="flex flex-col items-end gap-1 flex-1 min-w-0">
              <p className="text-white/80 truncate w-full text-right text-[13px] font-bold">{homeName}</p>
              <span className="text-fair-play-gold font-[family-name:var(--font-lexend)] text-[52px] font-black leading-none">{homeScore}</span>
            </div>
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <span className="text-white/30 font-[family-name:var(--font-lexend)] text-[28px] font-black">—</span>
              {status === "live" && (
                <Link href={`/organizer/match/${matchId}`}
                  className="flex items-center gap-1 bg-red-card/90 text-white border-2 border-red-card px-2.5 h-7 rounded-sm hover:bg-red-card transition-colors text-[11px] font-bold">
                  Manage Live
                </Link>
              )}
            </div>
            <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
              <p className="text-white/80 truncate w-full text-[13px] font-bold">{awayName}</p>
              <span className="text-fair-play-gold font-[family-name:var(--font-lexend)] text-[52px] font-black leading-none">{awayScore}</span>
            </div>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Report label */}
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-muted-foreground" />
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Match Report</p>
          </div>

          {/* Scoring Breakdown */}
          <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
            <div className="bg-pitch-green px-5 py-3.5 border-b-2 border-navy">
              <p className="text-white font-[family-name:var(--font-lexend)] text-sm font-bold">Scoring Breakdown</p>
            </div>
            {activeRows.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground italic text-[13px]">No events recorded</p>
              </div>
            ) : (
              <div>
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-4 py-2 border-b border-border bg-muted/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-16 text-center truncate">{homeShort}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-16 text-center truncate">{awayShort}</span>
                </div>
                <div className="border-t border-border">
                  {activeRows.map((row, idx) => {
                    const h = events.filter(e => e.isHome && e.type === row.type).length;
                    const a = events.filter(e => !e.isHome && e.type === row.type).length;
                    const hWins = h > a;
                    const aWins = a > h;
                    return (
                      <div key={row.type}
                        className={`grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-4 py-2.5 ${idx % 2 === 0 ? "bg-muted/10" : ""}`}>
                        <span className="text-[13px] text-foreground font-medium">{row.label}</span>
                        <span className={`w-16 text-center font-[family-name:var(--font-lexend)] text-sm font-extrabold ${hWins ? "text-pitch-green" : "text-foreground"}`}>{h}</span>
                        <span className={`w-16 text-center font-[family-name:var(--font-lexend)] text-sm font-extrabold ${aWins ? "text-pitch-green" : "text-foreground"}`}>{a}</span>
                      </div>
                    );
                  })}
                  {/* Total Points row */}
                  <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-4 py-3 border-t-2 border-border bg-muted/30">
                    <span className="text-[13px] text-foreground font-black uppercase tracking-wide">Total Points</span>
                    <span className={`w-16 text-center font-[family-name:var(--font-lexend)] text-base font-black ${homeScore > awayScore ? "text-pitch-green" : "text-foreground"}`}>{homeScore}</span>
                    <span className={`w-16 text-center font-[family-name:var(--font-lexend)] text-base font-black ${awayScore > homeScore ? "text-pitch-green" : "text-foreground"}`}>{awayScore}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Scorers */}
          {hasScorers && (
            <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
              <div className="bg-pitch-green px-5 py-3.5 border-b-2 border-navy">
                <p className="text-white font-[family-name:var(--font-lexend)] text-sm font-bold">Scorers</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-border">
                {/* Home scorers */}
                <div className="p-3 flex flex-col gap-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{homeShort}</p>
                  {homeScorers.length === 0 ? (
                    <p className="text-muted-foreground text-xs italic">—</p>
                  ) : (
                    homeScorers.map(s => (
                      <div key={s.name} className="flex flex-col gap-0.5">
                        <p className="text-[13px] font-semibold text-foreground leading-tight">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          {s.labels.join(", ")}
                          <span className="text-pitch-green font-bold ml-1">+{s.pts}</span>
                        </p>
                      </div>
                    ))
                  )}
                </div>
                {/* Away scorers */}
                <div className="p-3 flex flex-col gap-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{awayShort}</p>
                  {awayScorers.length === 0 ? (
                    <p className="text-muted-foreground text-xs italic">—</p>
                  ) : (
                    awayScorers.map(s => (
                      <div key={s.name} className="flex flex-col gap-0.5">
                        <p className="text-[13px] font-semibold text-foreground leading-tight">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          {s.labels.join(", ")}
                          <span className="text-pitch-green font-bold ml-1">+{s.pts}</span>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Performance Stats */}
          <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
            <div className="bg-pitch-green px-5 py-3.5 border-b-2 border-navy">
              <p className="text-white font-[family-name:var(--font-lexend)] text-sm font-bold">Performance Stats</p>
            </div>
            {!hasStatEvents ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground italic text-[13px]">No stats recorded — use the stat buttons in the match centre next time</p>
              </div>
            ) : (
              <div className="p-4 flex flex-col gap-4">
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-1 mb-1">
                  <span />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-14 text-center">{homeShort}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-14 text-center">{awayShort}</span>
                </div>
                {STAT_GROUPS.map(sg => (
                  <div key={sg.label}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2 px-1">{sg.label}</p>
                    <div className="border-2 border-border rounded-sm overflow-hidden">
                      {sg.stats.map((stat, idx) => {
                        const h = statEvents.filter(e => e.isHome && e.statType === stat).length;
                        const a = statEvents.filter(e => !e.isHome && e.statType === stat).length;
                        const hWins = h > a;
                        const aWins = a > h;
                        return (
                          <div key={stat}
                            className={`grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-3 py-2 ${idx % 2 === 0 ? "bg-muted/20" : ""}`}>
                            <span className="text-[12px] text-foreground font-medium">{STAT_CONFIG[stat].full}</span>
                            <span className={`w-14 text-center font-[family-name:var(--font-lexend)] text-sm font-extrabold ${hWins ? "text-pitch-green" : "text-foreground"}`}>{h}</span>
                            <span className={`w-14 text-center font-[family-name:var(--font-lexend)] text-sm font-extrabold ${aWins ? "text-pitch-green" : "text-foreground"}`}>{a}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event Log */}
          <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
            <div className="bg-pitch-green px-5 py-3.5 border-b-2 border-navy flex items-center justify-between">
              <p className="text-white font-[family-name:var(--font-lexend)] text-sm font-bold">Event Log</p>
              <span className="bg-fair-play-gold text-pitch-green px-2 py-0.5 rounded-sm text-[11px] font-bold">
                {events.length} events
              </span>
            </div>
            {events.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <p className="text-muted-foreground italic text-[13px]">No events recorded</p>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {events.map((ev) => (
                  <div key={ev.id} className={`px-5 py-3 flex items-center gap-3 ${ev.isHome ? "" : "flex-row-reverse"}`}>
                    <span className="bg-pitch-green/10 text-pitch-green w-10 text-center rounded-sm flex-shrink-0 font-[family-name:var(--font-lexend)] text-xs font-extrabold">
                      {ev.minute}&apos;
                    </span>
                    <span className={`px-2 py-0.5 rounded-sm flex-shrink-0 text-[11px] font-black ${EVENT_CONFIG[ev.type]!.colorClass}`}>
                      {EVENT_CONFIG[ev.type]!.label}
                    </span>
                    <div className={`flex-1 min-w-0 ${ev.isHome ? "" : "text-right"}`}>
                      <p className="text-foreground truncate text-[13px] font-semibold">{ev.playerName}</p>
                      <p className="text-muted-foreground text-[11px]">{ev.isHome ? homeShort : awayShort}</p>
                    </div>
                    {ev.points > 0 && (
                      <span className="text-pitch-green flex-shrink-0 font-[family-name:var(--font-lexend)] text-sm font-extrabold">+{ev.points}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
