"use client";

import { useState } from "react";
import {
  Trophy,
  AlertCircle,
  Zap,
  Target,
  Square,
  ArrowRight,
  Users,
} from "lucide-react";
import type { StandingRow } from "@modules/match";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TournamentStats {
  topScorer: { name: string; points: number } | null;
  topTry: { name: string; tries: number } | null;
  yellowCards: number;
  redCards: number;
}

export interface StandingsClientProps {
  standings: Record<string, StandingRow[]>;
  stats: TournamentStats;
  bracket: KnockoutBracketData;
}

// ---------------------------------------------------------------------------
// Bracket types
// ---------------------------------------------------------------------------

export type BracketStatus = "completed" | "upcoming" | "live" | "tbd";

export interface BracketMatch {
  id: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  status: BracketStatus;
  venue?: string;
  time?: string;
}

export interface KnockoutBracketData {
  qf: BracketMatch[];
  sf: BracketMatch[];
  final: BracketMatch;
  third: BracketMatch;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatsPanel({ stats }: { stats: TournamentStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-card border-2 border-border p-4 rounded-sm shadow-brutalist-navy-sm">
        <div className="flex items-center gap-2 mb-2">
          <Target size={14} className="text-pitch-green" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Top Scorer</span>
        </div>
        <p className="font-lexend text-xl font-black text-pitch-green truncate">{stats.topScorer?.name ?? "—"}</p>
        <p className="text-[11px] font-bold text-fair-play-gold-dark uppercase">{stats.topScorer?.points ?? 0} Points</p>
      </div>

      <div className="bg-card border-2 border-border p-4 rounded-sm shadow-brutalist-navy-sm">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-fair-play-gold" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Top Try</span>
        </div>
        <p className="font-lexend text-xl font-black text-pitch-green truncate">{stats.topTry?.name ?? "—"}</p>
        <p className="text-[11px] font-bold text-fair-play-gold-dark uppercase">{stats.topTry?.tries ?? 0} Tries</p>
      </div>

      <div className="bg-card border-2 border-border p-4 rounded-sm shadow-brutalist">
        <div className="flex items-center gap-2 mb-2">
          <Square size={14} className="text-yellow-card fill-yellow-card" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Yellow Cards</span>
        </div>
        <p className="font-lexend text-3xl font-black text-pitch-green">{stats.yellowCards}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-tight font-semibold">Tournament Total</p>
      </div>

      <div className="bg-card border-2 border-border p-4 rounded-sm shadow-brutalist-red">
        <div className="flex items-center gap-2 mb-2">
          <Square size={14} className="text-red-card fill-red-card" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Red Cards</span>
        </div>
        <p className="font-lexend text-3xl font-black text-pitch-green">{stats.redCards}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-tight font-semibold">Tournament Total</p>
      </div>
    </div>
  );
}

function AdvancementGraphic() {
  return (
    <div className="bg-pitch-green text-white rounded-sm p-6 border-2 border-navy shadow-brutalist-navy overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-fair-play-gold rounded-full flex items-center justify-center shadow-brutalist-navy-xs">
            <Trophy size={20} className="text-pitch-green" />
          </div>
          <div>
            <h3 className="font-lexend text-lg font-bold">The Road to Glory</h3>
            <p className="text-white/60 text-xs font-medium">Tournament Advancement Path</p>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
          <span className="bg-white/10 px-2 py-1 rounded-sm text-[10px] font-bold uppercase">Pools</span>
          <ArrowRight size={14} className="text-white/40 self-center" />
          <span className="bg-white/10 px-2 py-1 rounded-sm text-[10px] font-bold uppercase border border-white/20">Knockouts</span>
          <ArrowRight size={14} className="text-white/40 self-center" />
          <span className="bg-fair-play-gold text-pitch-green px-2 py-1 rounded-sm text-[10px] font-bold uppercase">Final</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 relative">
        <div className="hidden md:block absolute left-[12.5%] right-[12.5%] top-6 h-[2px] bg-white/10 -z-0" />

        <div className="flex-1 w-full flex flex-col items-center gap-3 text-center relative z-10">
          <div className="w-12 h-12 rounded-sm border-2 border-white/20 flex items-center justify-center bg-white/5">
            <Users size={20} />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sm">Group Stage</p>
            <p className="text-[11px] text-white/50">9 Teams • 2 Pools</p>
          </div>
        </div>

        <div className="flex-1 w-full flex flex-col items-center gap-3 text-center relative z-10">
          <div className="w-12 h-12 rounded-sm border-2 border-fair-play-gold/50 flex items-center justify-center bg-fair-play-gold/10">
            <span className="font-lexend font-black text-fair-play-gold text-lg">8</span>
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sm">Cup Quarter-Finals</p>
            <p className="text-[11px] text-fair-play-gold font-bold italic">Top teams advance</p>
          </div>
        </div>

        <div className="flex-1 w-full flex flex-col items-center gap-3 text-center relative z-10">
          <div className="w-12 h-12 rounded-sm border-2 border-white/20 flex items-center justify-center bg-white/5">
            <span className="font-lexend font-black text-white/40 text-lg">4</span>
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sm">Semi-Finals</p>
            <p className="text-[11px] text-white/50">Winners of QF</p>
          </div>
        </div>

        <div className="flex-1 w-full flex flex-col items-center gap-3 text-center relative z-10">
          <div className="w-16 h-16 rounded-sm border-4 border-fair-play-gold flex items-center justify-center bg-fair-play-gold shadow-[0_0_20px_rgba(255,186,32,0.3)]">
            <Trophy size={32} className="text-pitch-green" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-base text-fair-play-gold uppercase tracking-tighter">Grand Final</p>
            <p className="text-[10px] text-white/70 font-black tracking-widest italic">Winner Takes Cup</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StandingsTable({ group, rows }: { group: string; rows: StandingRow[] }) {
  return (
    <div className="bg-card border-2 border-border rounded-sm overflow-x-auto shadow-brutalist-navy">
      <div className="bg-pitch-green border-b-2 border-navy px-5 py-3 flex items-center justify-between">
        <h3 className="text-white font-lexend text-[15px] font-bold">Group {group}</h3>
        <span className="text-white/50 text-xs">Top 2 advance</span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted">
            {(["Pos", "Team", "P", "W", "D", "L", "PF", "PA", "PD", "Pts"] as const).map(h => (
              <th
                key={h}
                className={`py-2.5 text-muted-foreground text-[11px] font-bold uppercase tracking-[0.05em] ${h === "Team" ? "px-4 text-left" : "px-2 text-center"}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => {
            const advances = i < 2 && row.p > 0;
            const pd = row.pf - row.pa;
            return (
              <tr key={row.teamId} className={`${advances ? "bg-pitch-green-container/30" : ""} ${i === 1 && advances ? "border-b-2 border-border" : ""}`}>
                <td className="py-3 px-2 text-center">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto text-xs font-bold ${i === 0 && row.p > 0 ? "bg-fair-play-gold text-pitch-green" : i === 1 && row.p > 0 ? "bg-pitch-green-container text-pitch-green" : "text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground text-sm font-semibold">{row.teamName}</span>
                    {advances && <span className="text-pitch-green text-[10px] font-bold">↑ ADV</span>}
                  </div>
                </td>
                {([row.p, row.w, row.d, row.l, row.pf, row.pa] as number[]).map((v, j) => (
                  <td key={j} className="py-3 px-2 text-center text-foreground text-[13px]">{v}</td>
                ))}
                <td className={`py-3 px-2 text-center text-[13px] ${pd >= 0 ? "text-pitch-green" : "text-red-card"}`}>
                  {pd >= 0 ? `+${pd}` : pd}
                </td>
                <td className="py-3 px-2 text-center">
                  <span className="text-pitch-green font-lexend text-[15px] font-extrabold">{row.pts}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BracketCard({ match, label }: { match: BracketMatch; label?: string }) {
  const homeWon = match.status === "completed" && match.homeScore > match.awayScore;
  const awayWon = match.status === "completed" && match.awayScore > match.homeScore;
  const isTBD = match.status === "tbd";
  const isLive = match.status === "live";

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-bold">{label}</p>
      )}
      <div
        className={`bg-card rounded-sm overflow-hidden border-2 min-w-[200px] ${isLive ? "border-red-card" : isTBD ? "border-dashed border-border opacity-60" : "border-border"}`}
        style={{ boxShadow: isTBD ? "none" : isLive ? "4px 4px 0 var(--red-card)" : "4px 4px 0 var(--navy)" }}
      >
        {match.venue && !isTBD && (
          <div className={`px-3 py-1 border-b border-border flex items-center justify-between ${isLive ? "bg-red-card/10" : "bg-muted"}`}>
            <span className="text-muted-foreground text-[10px] font-bold">{match.venue}</span>
            {match.time && !isLive && (
              <span className="text-muted-foreground text-[10px]">{match.time}</span>
            )}
            {isLive && (
              <span className="bg-red-card text-white px-1.5 py-0.5 rounded-sm animate-pulse text-[9px] font-bold">● LIVE</span>
            )}
          </div>
        )}
        <div className={`px-3 py-2.5 flex items-center gap-3 ${homeWon ? "bg-pitch-green-container/20" : ""}`}>
          <span className={`flex-1 truncate text-[13px] ${homeWon ? "text-pitch-green font-bold" : "text-foreground font-medium"}`}>
            {match.home}
          </span>
          {!isTBD && (
            <span className={`font-lexend text-base font-extrabold text-center min-w-[20px] ${homeWon ? "text-pitch-green" : "text-foreground"}`}>
              {match.status === "upcoming" ? "–" : match.homeScore}
            </span>
          )}
        </div>
        <div className="border-t border-border" />
        <div className={`px-3 py-2.5 flex items-center gap-3 ${awayWon ? "bg-pitch-green-container/20" : ""}`}>
          <span className={`flex-1 truncate text-[13px] ${awayWon ? "text-pitch-green font-bold" : "text-foreground font-medium"}`}>
            {match.away}
          </span>
          {!isTBD && (
            <span className={`font-lexend text-base font-extrabold text-center min-w-[20px] ${awayWon ? "text-pitch-green" : "text-foreground"}`}>
              {match.status === "upcoming" ? "–" : match.awayScore}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function KnockoutBracket({ bracket }: { bracket: KnockoutBracketData }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card border-2 border-border rounded-sm px-5 py-3 flex items-center gap-3 shadow-brutalist-navy">
        <Trophy size={15} className="text-fair-play-gold flex-shrink-0" />
        <span className="text-foreground font-bold font-lexend text-[15px]">Knockout Bracket</span>
        <span className="text-muted-foreground text-xs">Quarter-finals → Semi-finals → Final</span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-6 min-w-[700px]">
          <div className="flex flex-col gap-4 flex-1">
            <p className="text-muted-foreground uppercase tracking-wider text-[11px] font-bold">Quarter-finals</p>
            {bracket.qf.map(m => <BracketCard key={m.id} match={m} />)}
          </div>

          <div className="flex items-center">
            <div className="flex flex-col gap-2 items-center justify-center h-full px-1">
              <div className="w-px h-full bg-border" />
            </div>
          </div>

          <div className="flex flex-col justify-around flex-1">
            <div>
              <p className="text-muted-foreground uppercase tracking-wider mb-4 text-[11px] font-bold">Semi-finals</p>
              <div className="flex flex-col gap-[72px]">
                {bracket.sf.map(m => <BracketCard key={m.id} match={m} />)}
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-px h-full bg-border mx-1" />
          </div>

          <div className="flex flex-col justify-center gap-5 flex-1">
            <BracketCard match={bracket.final} label="Final" />
            <BracketCard match={bracket.third} label="3rd Place" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client export
// ---------------------------------------------------------------------------

type Phase = "groups" | "knockout";

const FALLBACK_GROUPS = ["A", "B", "C", "D", "E", "F"];

export function StandingsClient({ standings, stats, bracket }: StandingsClientProps) {
  const groupKeys = Object.keys(standings).sort();
  const groups = groupKeys.length > 0 ? groupKeys : FALLBACK_GROUPS;

  const [phase, setPhase] = useState<Phase>("groups");
  const [activeGroup, setActiveGroup] = useState<string>(groups[0] ?? "A");

  const activeRows = standings[activeGroup] ?? [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-background border-b-2 border-border px-6 h-14 flex items-center justify-between flex-shrink-0">
        <h1 className="text-foreground font-lexend text-lg font-bold">Standings</h1>
        <div className="flex items-center gap-0 border-2 border-border rounded-sm overflow-hidden">
          {(["groups", "knockout"] as Phase[]).map(p => (
            <button key={p} onClick={() => setPhase(p)}
              className={`px-4 py-1.5 capitalize transition-colors text-[13px] font-bold ${phase === p ? "bg-pitch-green text-white" : "bg-card text-foreground hover:bg-muted"}`}>
              {p === "groups" ? "Group Stage" : "Knockout"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
        <StatsPanel stats={stats} />

        {phase === "groups" && (
          <>
            <div className="bg-card border-2 border-border rounded-sm px-5 py-3 flex items-center gap-6 flex-wrap shadow-brutalist-navy">
              <span className="text-muted-foreground uppercase tracking-wider text-[11px] font-bold">Points system:</span>
              {([["Win", "3 pts"], ["Draw", "1 pt"], ["Loss", "0 pts"]] as [string, string][]).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="text-foreground text-xs font-bold">{k}</span>
                  <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm text-[11px] font-bold">{v}</span>
                </span>
              ))}
            </div>

            <AdvancementGraphic />

            <div className="flex items-center gap-0 border-2 border-border rounded-sm overflow-x-auto self-start">
              {groups.map(g => (
                <button key={g} onClick={() => setActiveGroup(g)}
                  className={`px-5 py-2.5 transition-colors border-r last:border-r-0 border-border text-sm font-bold ${activeGroup === g ? "bg-pitch-green text-white" : "bg-card text-foreground hover:bg-muted"}`}>
                  Group {g}
                </button>
              ))}
            </div>

            <StandingsTable group={activeGroup} rows={activeRows} />

            <h2 className="text-foreground font-lexend text-base font-bold">All Groups</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groups.map(g => <StandingsTable key={g} group={g} rows={standings[g] ?? []} />)}
            </div>
          </>
        )}

        {phase === "knockout" && (
          <>
            <div className="bg-card border-2 border-fair-play-gold rounded-sm px-5 py-3 flex items-start gap-3 shadow-brutalist-dark">
              <AlertCircle size={15} className="text-fair-play-gold-dark flex-shrink-0 mt-0.5" />
              <p className="text-muted-foreground text-[13px]">
                Group stage still in progress. The bracket below reflects current standings — advancing teams will update as results come in.
              </p>
            </div>
            <KnockoutBracket bracket={bracket} />
          </>
        )}
      </div>
    </div>
  );
}
