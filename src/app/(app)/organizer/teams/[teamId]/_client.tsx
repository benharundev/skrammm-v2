"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Mail, MapPin, Users, Calendar,
  Hash, User, ChevronLeft, ChevronRight,
} from "lucide-react";

const PAGE_SIZE = 10;

export interface RosterPlayer {
  id: string;
  number: number | null;
  name: string;
  position: string | null;
}

export interface TeamInfo {
  id: string;
  name: string;
  shortName: string;
  group: string;
  manager: string;
  managerEmail: string;
  origin: string;
  rosterCount: number;
  joinedAt: string;
  status: "pending" | "approved";
}

interface Props {
  team: TeamInfo;
  roster: RosterPlayer[];
}

export function TeamDetailClient({ team, roster }: Props) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(roster.length / PAGE_SIZE));
  const pageRoster = roster.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const fromIdx = (page - 1) * PAGE_SIZE + 1;
  const toIdx = Math.min(page * PAGE_SIZE, roster.length);

  const infoRows = [
    { icon: User,     label: "Manager",    value: team.manager },
    { icon: Mail,     label: "Email",      value: team.managerEmail },
    { icon: MapPin,   label: "Origin",     value: team.origin },
    { icon: Users,    label: "Players",    value: `${team.rosterCount} registered` },
    { icon: Calendar, label: "Joined",     value: new Date(team.joinedAt).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" }) },
    { icon: Hash,     label: "Short Name", value: team.shortName },
  ] as { icon: React.ComponentType<{ size: number; className?: string }>; label: string; value: string }[];

  const pageButtons: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageButtons.push(i);
  } else if (page <= 4) {
    pageButtons.push(1, 2, 3, 4, 5, "...", totalPages);
  } else if (page >= totalPages - 3) {
    pageButtons.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
  } else {
    pageButtons.push(1, "...", page - 1, page, page + 1, "...", totalPages);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-background border-b-2 border-border px-6 h-14 flex items-center gap-3 flex-shrink-0">
        <Link href="/organizer/teams"
          className="h-8 w-8 border-2 border-border rounded-sm flex items-center justify-center text-muted-foreground hover:border-navy hover:text-foreground transition-colors flex-shrink-0">
          <ArrowLeft size={15} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-foreground truncate text-lg font-bold">{team.name}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="bg-pitch-green text-white px-2.5 py-1 rounded-sm text-xs font-bold">Group {team.group}</span>
          <span className={`px-2.5 py-1 rounded-sm border-2 text-xs font-bold ${team.status === "approved" ? "bg-pitch-green/10 text-pitch-green border-pitch-green/30" : "bg-fair-play-gold/15 text-fair-play-gold-dark border-fair-play-gold/30"}`}>
            {team.status === "approved" ? "Approved" : "Pending"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
          <div className="bg-pitch-green px-5 py-4 border-b-2 border-navy">
            <p className="text-white font-lexend text-[15px] font-bold">Team Information</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x-0 divide-border">
            {infoRows.map(({ icon: Icon, label, value }, i) => (
              <div key={label} className={`px-5 py-4 flex items-start gap-4 ${i < infoRows.length - 2 ? "border-b border-border" : i === infoRows.length - 2 ? "border-b sm:border-b border-border" : ""}`}>
                <div className="w-9 h-9 border-2 border-border rounded-sm flex items-center justify-center flex-shrink-0 bg-muted/30">
                  <Icon size={16} className="text-pitch-green" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-[0.04em]">{label}</p>
                  <p className="text-foreground truncate text-sm font-semibold">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
          <div className="bg-pitch-green px-5 py-4 border-b-2 border-navy flex items-center justify-between">
            <p className="text-white font-lexend text-[15px] font-bold">Player Roster</p>
            <span className="bg-fair-play-gold text-pitch-green px-2.5 py-0.5 rounded-sm text-xs font-bold">{roster.length} players</span>
          </div>

          {roster.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Users size={32} className="text-muted-foreground/40" />
              <p className="text-muted-foreground text-[13px]">No players registered yet.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/30">
                      {["#", "Player Name", "Position"].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-muted-foreground text-[11px] font-bold uppercase tracking-[0.05em]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pageRoster.map((player) => (
                      <tr key={player.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="bg-pitch-green text-white w-9 h-6 flex items-center justify-center rounded-sm font-lexend text-xs font-extrabold">{player.number ?? "—"}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-foreground text-sm font-semibold">{player.name}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-muted-foreground text-[13px]">{player.position ?? "—"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-5 py-4 border-t-2 border-border flex items-center justify-between gap-4 flex-wrap">
                  <span className="text-muted-foreground text-xs">
                    Showing {fromIdx}–{toIdx} of {roster.length} players
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="h-8 w-8 border-2 border-border rounded-sm flex items-center justify-center text-muted-foreground hover:border-navy hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <ChevronLeft size={14} />
                    </button>
                    {pageButtons.map((btn, i) =>
                      btn === "..." ? (
                        <span key={`ellipsis-${i}`} className="w-8 text-center text-muted-foreground text-xs">…</span>
                      ) : (
                        <button key={btn} onClick={() => setPage(btn as number)}
                          className={`h-8 w-8 border-2 rounded-sm transition-colors text-xs font-bold ${page === btn ? "bg-pitch-green text-white border-pitch-green" : "border-border text-foreground hover:border-navy"}`}>{btn}</button>
                      )
                    )}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="h-8 w-8 border-2 border-border rounded-sm flex items-center justify-center text-muted-foreground hover:border-navy hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
