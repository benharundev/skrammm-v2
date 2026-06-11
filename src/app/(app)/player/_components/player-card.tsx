import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ReliabilityRing } from "./reliability-ring";

interface PlayerCardProps {
  player: {
    fullName: string;
    jerseyNumber: number | null;
    position: string | null;
    playerIdCode: string;
  };
  team: { name: string } | null;
  stats: {
    tries: number;
    matchesPlayed: number;
    yellowCards: number;
    redCards: number;
  };
  reliabilityScore: number;
  className?: string;
  id?: string;
  shareAction?: ReactNode;
}

const STAT_COLS = [
  { key: "matchesPlayed" as const, label: "Matches" },
  { key: "tries" as const, label: "Tries" },
  { key: "yellowCards" as const, label: "YC" },
  { key: "redCards" as const, label: "RC" },
];

export function PlayerCard({ player, team, stats, reliabilityScore, className, id, shareAction }: PlayerCardProps) {
  return (
    <div
      id={id}
      className={cn(
        "overflow-hidden rounded-sm bg-primary text-white shadow-brutalist-lg",
        className
      )}
    >
      {/* Gold accent bar */}
      <div className="h-1.5 w-full bg-accent" />

      <div className="flex items-center gap-4 p-5">
        {/* Jersey badge */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="flex h-16 w-16 items-center justify-center rounded-sm bg-accent shadow-brutalist-green">
            <span className="font-[family-name:var(--font-lexend)] text-2xl font-black text-primary leading-none">
              {player.jerseyNumber ?? "—"}
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-widest text-white/50">
            {player.position ?? "Player"}
          </span>
        </div>

        {/* Name + team */}
        <div className="flex-1 min-w-0">
          <p className="truncate font-[family-name:var(--font-lexend)] text-xl font-black text-white leading-tight">
            {player.fullName}
          </p>
          {team && (
            <p className="text-sm text-white/60 truncate">{team.name}</p>
          )}
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-accent/80">
            #{player.playerIdCode}
          </p>
        </div>

        {/* Reliability ring */}
        <ReliabilityRing score={reliabilityScore} size={72} className="shrink-0" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 divide-x divide-white/10 border-t border-white/10">
        {STAT_COLS.map(({ key, label }) => (
          <div key={key} className="flex flex-col items-center py-3">
            <span className="font-[family-name:var(--font-lexend)] text-lg font-black text-accent leading-none">
              {stats[key]}
            </span>
            <span className="mt-0.5 text-[9px] uppercase tracking-wider text-white/40">{label}</span>
          </div>
        ))}
      </div>

      {/* Watermark footer */}
      <div className="flex items-center justify-between border-t border-accent/30 px-5 py-2">
        <span className="font-[family-name:var(--font-lexend)] text-xs font-black tracking-[0.2em] text-accent">
          SKRAMMM
        </span>
        <div className="flex items-center gap-3">
          {shareAction}
          <span className="font-mono text-[9px] text-white/30">skrammm.com</span>
        </div>
      </div>
    </div>
  );
}
