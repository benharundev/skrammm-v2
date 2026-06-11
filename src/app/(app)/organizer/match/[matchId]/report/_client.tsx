"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Pencil, Save, X, Upload, Download,
  FileText, Clock, MapPin, User, AlertTriangle,
} from "lucide-react";
import { EVENT_CONFIG, STAT_CONFIG, STAT_GROUPS } from "@/app/(app)/organizer/_lib/event-config";

type StatType =
  | "tackles_dom" | "tackles_passive" | "tackles_miss"
  | "line_breaks" | "ball_carries" | "offloads"
  | "handling_errors" | "rucks_secured" | "turnovers_won"
  | "scrums_won" | "scrums_lost" | "lineouts_won"
  | "lineouts_lost" | "penalties_conceded";

type StatsMap = Record<StatType, number>;

const EMPTY_STATS: StatsMap = {
  tackles_dom: 0, tackles_passive: 0, tackles_miss: 0,
  line_breaks: 0, ball_carries: 0, offloads: 0,
  handling_errors: 0, rucks_secured: 0, turnovers_won: 0,
  scrums_won: 0, scrums_lost: 0, lineouts_won: 0,
  lineouts_lost: 0, penalties_conceded: 0,
};

const STAT_KEYS = Object.keys(EMPTY_STATS) as StatType[];

const CSV_TEMPLATE = [
  "stat,home,away",
  "score,0,0",
  ...STAT_KEYS.map(k => `${k},0,0`),
].join("\n");

function parseCSV(text: string): {
  homeScore: number; awayScore: number;
  home: StatsMap; away: StatsMap;
} | string {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0]?.trim().toLowerCase();
  if (header !== "stat,home,away") return "Expected header: stat,home,away";

  let homeScore = 0;
  let awayScore = 0;
  const home = { ...EMPTY_STATS };
  const away = { ...EMPTY_STATS };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line?.trim()) continue;
    const parts = line.split(",");
    if (parts.length < 3) return `Line ${i + 1}: expected 3 columns`;
    const [statRaw, homeRaw, awayRaw] = parts;
    const stat = statRaw?.trim() ?? "";
    const h = parseInt(homeRaw?.trim() ?? "", 10);
    const a = parseInt(awayRaw?.trim() ?? "", 10);
    if (isNaN(h) || isNaN(a)) return `Line ${i + 1}: non-numeric values`;

    if (stat === "score") {
      homeScore = h;
      awayScore = a;
    } else if (STAT_KEYS.includes(stat as StatType)) {
      home[stat as StatType] = h;
      away[stat as StatType] = a;
    }
  }

  return { homeScore, awayScore, home, away };
}

const PHASE_LABELS: Record<string, string> = {
  scheduled: "Upcoming",
  live: "Live",
  completed: "Completed",
  locked: "Locked",
};

export interface NormalizedEvent {
  id: string;
  minute: number;
  isHome: boolean;
  type: keyof typeof EVENT_CONFIG;
  playerName: string;
  points: number;
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
}

export function MatchReportClient({
  matchId,
  status,
  homeScore: initialHomeScore,
  awayScore: initialAwayScore,
  group,
  venue,
  referee,
  scheduledTime,
  homeName,
  awayName,
  homeShort,
  awayShort,
  events,
}: MatchReportProps) {
  const [editMode, setEditMode] = useState(false);
  const [homeScore, setHomeScore] = useState(initialHomeScore);
  const [awayScore, setAwayScore] = useState(initialAwayScore);
  const [homeStats, setHomeStats] = useState<StatsMap | null>(null);
  const [awayStats, setAwayStats] = useState<StatsMap | null>(null);
  const [snapshot, setSnapshot] = useState<{
    homeScore: number; awayScore: number;
    homeStats: StatsMap | null; awayStats: StatsMap | null;
  } | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canEdit = true;

  const startEdit = () => {
    setSnapshot({ homeScore, awayScore, homeStats, awayStats });
    setEditMode(true);
  };

  const saveEdit = () => {
    setSnapshot(null);
    setEditMode(false);
  };

  const cancelEdit = () => {
    if (snapshot) {
      setHomeScore(snapshot.homeScore);
      setAwayScore(snapshot.awayScore);
      setHomeStats(snapshot.homeStats);
      setAwayStats(snapshot.awayStats);
    }
    setSnapshot(null);
    setEditMode(false);
  };

  const enterManually = () => {
    setHomeStats({ ...EMPTY_STATS });
    setAwayStats({ ...EMPTY_STATS });
    startEdit();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const result = parseCSV(text);
      if (typeof result === "string") {
        setCsvError(result);
      } else {
        setHomeScore(result.homeScore);
        setAwayScore(result.awayScore);
        setHomeStats(result.home);
        setAwayStats(result.away);
        startEdit();
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `match-${matchId}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statsAvailable = homeStats !== null && awayStats !== null;

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
          <p className="text-white text-sm font-bold truncate font-lexend">
            {homeName} vs {awayName}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-sm border-2 flex-shrink-0 text-xs font-bold ${
          status === "live" ? "border-fair-play-gold bg-fair-play-gold/20 text-fair-play-gold animate-pulse"
          : status === "completed" ? "border-white/40 bg-white/10 text-white"
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
              {editMode ? (
                <input
                  type="number" min="0"
                  value={homeScore}
                  onChange={e => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 text-right bg-white/10 border-2 border-fair-play-gold text-fair-play-gold font-lexend text-[40px] font-black leading-none rounded-sm px-2 outline-none"
                />
              ) : (
                <span className="text-fair-play-gold font-lexend text-[52px] font-black leading-none">{homeScore}</span>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <span className="text-white/30 font-lexend text-[28px] font-black">—</span>
              {status === "live" && (
                <Link href={`/organizer/match/${matchId}`}
                  className="flex items-center gap-1 bg-red-card/90 text-white border-2 border-red-card px-2.5 h-7 rounded-sm hover:bg-red-card transition-colors text-[11px] font-bold">
                  Manage Live
                </Link>
              )}
            </div>
            <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
              <p className="text-white/80 truncate w-full text-[13px] font-bold">{awayName}</p>
              {editMode ? (
                <input
                  type="number" min="0"
                  value={awayScore}
                  onChange={e => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 bg-white/10 border-2 border-fair-play-gold text-fair-play-gold font-lexend text-[40px] font-black leading-none rounded-sm px-2 outline-none"
                />
              ) : (
                <span className="text-fair-play-gold font-lexend text-[52px] font-black leading-none">{awayScore}</span>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Edit / Save / Cancel toolbar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-muted-foreground" />
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Match Report</p>
            </div>
            {editMode ? (
              <div className="flex items-center gap-2">
                <button onClick={saveEdit}
                  className="flex items-center gap-1.5 bg-pitch-green text-white border-2 border-pitch-green px-3 h-8 rounded-sm hover:bg-pitch-green/90 transition-colors text-xs font-bold shadow-brutalist-navy-xs">
                  <Save size={12} /> Save
                </button>
                <button onClick={cancelEdit}
                  className="flex items-center gap-1.5 border-2 border-border text-muted-foreground px-3 h-8 rounded-sm hover:border-navy hover:text-foreground transition-colors text-xs font-bold">
                  <X size={12} /> Cancel
                </button>
              </div>
            ) : canEdit ? (
              <button onClick={startEdit}
                className="flex items-center gap-1.5 border-2 border-border text-foreground px-3 h-8 rounded-sm hover:border-navy transition-colors text-xs font-bold">
                <Pencil size={12} /> Edit
              </button>
            ) : null}
          </div>

          {/* Performance Stats */}
          <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
            <div className="bg-pitch-green px-5 py-3.5 border-b-2 border-navy flex items-center justify-between">
              <p className="text-white font-lexend text-sm font-bold">Performance Stats</p>
              {statsAvailable && !editMode && canEdit && (
                <button onClick={startEdit}
                  className="flex items-center gap-1 border-2 border-white/30 text-white/80 px-2 h-6 rounded-sm hover:border-white hover:text-white transition-colors text-[10px] font-bold">
                  <Pencil size={10} /> Edit
                </button>
              )}
            </div>

            {!statsAvailable ? (
              <div className="p-6 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle size={16} />
                  <p className="text-sm font-semibold">No stats recorded for this match</p>
                </div>
                <p className="text-[12px] text-muted-foreground text-center max-w-xs">
                  Upload a CSV file with stat data, or enter values manually.
                </p>
                {csvError && (
                  <div className="bg-red-card/10 border-2 border-red-card rounded-sm px-4 py-2.5 w-full max-w-xs">
                    <p className="text-red-card text-xs font-bold">CSV error: {csvError}</p>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1.5 bg-pitch-green text-white border-2 border-pitch-green px-4 h-9 rounded-sm hover:bg-pitch-green/90 transition-colors text-[13px] font-bold shadow-brutalist-navy-sm">
                    <Upload size={14} /> Upload CSV
                  </button>
                  <button onClick={downloadTemplate}
                    className="flex items-center gap-1.5 border-2 border-border text-foreground px-4 h-9 rounded-sm hover:border-navy transition-colors text-[13px] font-bold">
                    <Download size={14} /> Template
                  </button>
                  <button onClick={enterManually}
                    className="flex items-center gap-1.5 border-2 border-border text-muted-foreground px-4 h-9 rounded-sm hover:border-navy hover:text-foreground transition-colors text-[13px]">
                    Enter manually
                  </button>
                </div>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
              </div>
            ) : (
              <div className="p-4">
                {csvError && (
                  <div className="bg-red-card/10 border-2 border-red-card rounded-sm px-4 py-2.5 mb-4">
                    <p className="text-red-card text-xs font-bold">CSV error: {csvError}</p>
                  </div>
                )}
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 mb-2 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-16 text-center truncate">{homeShort}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-16 text-center truncate">{awayShort}</span>
                </div>

                {STAT_GROUPS.map(group => (
                  <div key={group.label} className="mb-4 last:mb-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2 px-1">{group.label}</p>
                    <div className="border-2 border-border rounded-sm overflow-hidden">
                      {group.stats.map((stat, idx) => {
                        const hVal = homeStats?.[stat] ?? 0;
                        const aVal = awayStats?.[stat] ?? 0;
                        const hWins = hVal > aVal;
                        const aWins = aVal > hVal;
                        return (
                          <div key={stat}
                            className={`grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-3 py-2 ${idx % 2 === 0 ? "bg-muted/20" : ""}`}>
                            <span className="text-[12px] text-foreground font-medium">{STAT_CONFIG[stat].full}</span>
                            {editMode ? (
                              <>
                                <input
                                  type="number" min="0"
                                  value={hVal}
                                  onChange={e => setHomeStats(s => s ? { ...s, [stat]: Math.max(0, parseInt(e.target.value) || 0) } : s)}
                                  className="w-16 text-center h-7 border-2 border-fair-play-gold/60 bg-fair-play-gold/5 rounded-sm text-[13px] font-bold outline-none focus:border-fair-play-gold"
                                />
                                <input
                                  type="number" min="0"
                                  value={aVal}
                                  onChange={e => setAwayStats(s => s ? { ...s, [stat]: Math.max(0, parseInt(e.target.value) || 0) } : s)}
                                  className="w-16 text-center h-7 border-2 border-fair-play-gold/60 bg-fair-play-gold/5 rounded-sm text-[13px] font-bold outline-none focus:border-fair-play-gold"
                                />
                              </>
                            ) : (
                              <>
                                <span className={`w-16 text-center font-lexend text-sm font-extrabold ${hWins ? "text-pitch-green" : "text-foreground"}`}>{hVal}</span>
                                <span className={`w-16 text-center font-lexend text-sm font-extrabold ${aWins ? "text-pitch-green" : "text-foreground"}`}>{aVal}</span>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Upload replacement if already has stats */}
                {!editMode && (
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 border-2 border-border text-muted-foreground px-3 h-7 rounded-sm hover:border-navy hover:text-foreground transition-colors text-[11px]">
                      <Upload size={11} /> Replace with CSV
                    </button>
                    <button onClick={downloadTemplate}
                      className="flex items-center gap-1.5 border-2 border-border text-muted-foreground px-3 h-7 rounded-sm hover:border-navy hover:text-foreground transition-colors text-[11px]">
                      <Download size={11} /> Template
                    </button>
                    <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Event Log */}
          <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
            <div className="bg-pitch-green px-5 py-3.5 border-b-2 border-navy flex items-center justify-between">
              <p className="text-white font-lexend text-sm font-bold">Event Log</p>
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
                    <span className="bg-pitch-green/10 text-pitch-green w-10 text-center rounded-sm flex-shrink-0 font-lexend text-xs font-extrabold">
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
                      <span className="text-pitch-green flex-shrink-0 font-lexend text-sm font-extrabold">+{ev.points}</span>
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
