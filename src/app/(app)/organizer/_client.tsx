"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Users, Calendar, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
import { startMatchAction } from "./actions";
import { PageHeader } from "./_components/page-header";
import { TournamentUrlBanner } from "./_components/tournament-url-banner";
import { PendingApprovalCard } from "./_components/pending-approval-card";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  group: string;
  manager: string;
  managerEmail: string;
  origin: string;
  rosterCount: number;
  joinedAt: string;
  status: "pending" | "approved" | "rejected";
}

interface DashboardMatch {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamShort: string;
  awayTeamShort: string;
  homeScore: number;
  awayScore: number;
  status: "live" | "completed" | "upcoming";
  group: string;
  venue: string;
  scheduledTime: string;
  referee: string | null;
}

interface TournamentSummary {
  name: string;
  code: string;
  dates: string;
  venue: string;
  totalTeams: number;
  approvedTeams: number;
  pendingTeams: number;
}

interface DashboardProps {
  tournament: TournamentSummary;
  matches: DashboardMatch[];
  teams: Team[];
  pendingTeams: Team[];
  liveMatches: DashboardMatch[];
  groups: string[];
}

export function OrganizerDashboard({
  tournament,
  matches,
  teams,
  pendingTeams,
  liveMatches,
  groups,
}: DashboardProps) {
  const [isPending, startTransition] = useTransition();
  const completedToday = matches.filter(m => m.status === "completed").length;
  const upcomingToday = matches.filter(m => m.status === "upcoming").length;
  const STATUS_ORDER: Record<DashboardMatch["status"], number> = { live: 0, upcoming: 1, completed: 2 };
  const todayMatches = [...matches].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]).slice(0, 10);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Dashboard"
        sub={`${tournament.dates} · ${tournament.venue}`}
        action={
          <Link href="/organizer/setup"
            className="flex items-center gap-2 bg-fair-play-gold text-pitch-green border-2 border-pitch-green px-4 h-9 rounded-sm text-[13px] font-bold shadow-brutalist-green-sm">
            + New Tournament
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
        {liveMatches.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="bg-red-card text-white px-2 py-0.5 rounded-sm animate-pulse text-[10px] font-bold tracking-[0.1em]">
                ● LIVE NOW
              </span>
              <span className="text-muted-foreground text-[10px] sm:text-xs">
                {liveMatches.length} match{liveMatches.length > 1 ? "es" : ""} in progress
              </span>
            </div>
            {liveMatches.map(match => (
              <div key={match.id} className="bg-card border-2 border-red-card rounded-sm px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 shadow-brutalist-red">
                <span className="w-fit bg-red-card/10 text-red-card border border-red-card/30 px-2.5 py-1 rounded-sm text-[11px] font-bold">
                  {match.venue}
                </span>
                <div className="flex-1 min-w-0 flex items-center justify-between sm:justify-center gap-4">
                  <span className="text-foreground text-right truncate text-[13px] sm:text-sm font-bold">
                    {match.homeTeamName}
                  </span>
                  <span className="flex-shrink-0 tabular-nums font-lexend text-lg sm:text-xl font-extrabold">
                    {match.homeScore} – {match.awayScore}
                  </span>
                  <span className="text-foreground text-left truncate text-[13px] sm:text-sm font-bold">
                    {match.awayTeamName}
                  </span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-red-card/20">
                  <span className="text-muted-foreground text-[11px]">
                    Grp {match.group} <span className="hidden xs:inline">· Ref: {match.referee ?? "—"}</span>
                  </span>
                  <Link href={`/organizer/match/${match.id}`}
                    className="flex items-center gap-1.5 bg-pitch-green text-white border-2 border-pitch-green px-3 sm:px-4 h-8 sm:h-9 rounded-sm text-xs sm:text-[13px] font-bold shadow-brutalist-navy-sm">
                    Match Center <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Teams",       value: tournament.totalTeams,   sub: `${tournament.approvedTeams} approved`, icon: Users,       accent: false },
            { label: "Pending Approvals", value: tournament.pendingTeams, sub: "need your review",                    icon: AlertCircle, accent: true  },
            { label: "Matches Today",     value: matches.length,          sub: `${upcomingToday} upcoming`,            icon: Calendar,    accent: false },
            { label: "Completed",         value: completedToday,          sub: "matches so far",                      icon: CheckCircle, accent: false },
          ].map(({ label, value, sub, icon: Icon, accent }) => (
            <div key={label} className={`bg-card border-2 rounded-sm p-4 ${accent ? "border-fair-play-gold" : "border-border"}`}
              style={{ boxShadow: accent ? "4px 4px 0 var(--fair-play-gold)" : "4px 4px 0 var(--navy)" }}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-muted-foreground uppercase tracking-wider text-[10px] font-bold">{label}</p>
                <Icon size={15} className={accent ? "text-fair-play-gold" : "text-muted-foreground"} />
              </div>
              <p className={`font-lexend text-[36px] font-extrabold leading-none ${accent ? "text-fair-play-gold-dark" : "text-pitch-green"}`}>{value}</p>
              <p className="text-muted-foreground mt-1 text-xs">{sub}</p>
            </div>
          ))}
        </div>

        <TournamentUrlBanner code={tournament.code} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-card border-2 border-border rounded-sm flex flex-col shadow-brutalist-navy">
            <div className="px-3 sm:px-5 py-3.5 border-b-2 border-border flex items-center justify-between">
              <h2 className="text-foreground text-[14px] sm:text-[15px] font-bold">Today&apos;s Fixtures</h2>
              <Link href="/organizer/schedule" className="flex items-center gap-1 text-navy hover:text-pitch-green transition-colors text-[11px] sm:text-[13px] font-semibold">
                All matches <ChevronRight size={14} />
              </Link>
            </div>
            <div className="divide-y divide-border flex-1">
              {todayMatches.map(match => (
                <div key={match.id} className="px-3 sm:px-5 py-2.5 grid grid-cols-[80px_1fr_80px] sm:grid-cols-[100px_1fr_100px] items-center gap-3">
                  {/* Left: Time/Status */}
                  <div className="flex-shrink-0">
                    <span className={`inline-block px-1.5 py-0.5 rounded-sm text-[9px] sm:text-[10px] font-bold ${match.status === "live" ? "bg-red-card text-white" : match.status === "completed" ? "bg-pitch-green-container text-pitch-green" : "bg-muted text-muted-foreground"}`}>
                      {match.status === "live" ? "● LIVE" : match.status === "completed" ? "FT" : match.scheduledTime}
                    </span>
                  </div>

                  {/* Center: Fixture */}
                  <div className="flex items-center justify-center gap-2 min-w-0">
                    <span className="text-foreground text-right flex-1 truncate text-[12px] sm:text-[13px] font-semibold">
                      {match.homeTeamShort}
                    </span>
                    <span className="flex-shrink-0 font-lexend text-sm sm:text-base font-extrabold px-1">
                      {match.status !== "upcoming" ? `${match.homeScore} – ${match.awayScore}` : (
                        <span className="text-muted-foreground text-[11px] sm:text-[12px] font-black italic uppercase tracking-tighter">vs</span>
                      )}
                    </span>
                    <span className="text-foreground flex-1 truncate text-[12px] sm:text-[13px] font-semibold">
                      {match.awayTeamShort}
                    </span>
                  </div>

                  {/* Right: Actions/Group */}
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-muted-foreground hidden md:block text-[11px] whitespace-nowrap">
                      Grp {match.group}
                    </span>
                    {match.status === "live" && (
                      <Link href={`/organizer/match/${match.id}`}
                        className="px-2 sm:px-2.5 py-1 rounded-sm border-2 text-[10px] sm:text-xs font-bold transition-colors bg-fair-play-gold text-pitch-green border-pitch-green">
                        Manage
                      </Link>
                    )}
                    {match.status === "upcoming" && (
                      <button
                        disabled={isPending}
                        onClick={() => startTransition(() => { void startMatchAction(match.id); })}
                        className="px-2 sm:px-2.5 py-1 rounded-sm border-2 text-[10px] sm:text-xs font-bold transition-colors border-navy text-navy hover:bg-navy hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                        Start
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div className="bg-card border-2 border-fair-play-gold rounded-sm flex flex-col shadow-brutalist-dark">
              <div className="px-3 sm:px-5 py-3.5 border-b-2 border-fair-play-gold flex items-center justify-between">
                <h2 className="text-foreground text-[14px] sm:text-[15px] font-bold">Pending Approvals</h2>
                <span className="bg-fair-play-gold text-pitch-green rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-xs font-bold">
                  {pendingTeams.length}
                </span>
              </div>
              <div className="p-3 sm:p-4 flex flex-col gap-3">
                {pendingTeams.map(team => <PendingApprovalCard key={team.id} team={team} variant="compact" />)}
                <Link href="/organizer/teams"
                  className="w-full border-2 border-border text-muted-foreground py-2 rounded-sm flex items-center justify-center gap-1.5 hover:border-pitch-green hover:text-pitch-green transition-colors text-[11px] sm:text-[13px] font-semibold">
                  View all teams <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-sm shadow-brutalist-navy">
          <div className="px-3 sm:px-5 py-3.5 border-b-2 border-border flex items-center justify-between">
            <h2 className="text-foreground text-[14px] sm:text-[15px] font-bold">
              Teams — {tournament.totalTeams} Registered
            </h2>
            <Link href="/organizer/teams" className="flex items-center gap-1 text-navy hover:text-pitch-green transition-colors text-[11px] sm:text-[13px] font-semibold">
              Manage teams <ChevronRight size={14} />
            </Link>
          </div>
          <div className="px-3 sm:px-5 py-3 flex flex-col sm:flex-row flex-wrap gap-x-4 gap-y-3">
            {groups.map(grp => {
              const grpTeams = teams.filter(t => t.group === grp);
              return (
                <div key={grp} className="flex items-center gap-1.5">
                  <span className="bg-pitch-green text-white px-1.5 py-0.5 rounded-sm text-[10px] font-bold min-w-[40px] text-center">
                    Grp {grp}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {grpTeams.map(t => (
                      <span key={t.id}
                        className={`px-2 py-0.5 rounded-sm border text-[10px] font-medium ${t.status === "pending" ? "border-fair-play-gold text-fair-play-gold-dark bg-fair-play-gold/10" : "border-border text-foreground"}`}>
                        {t.shortName}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
