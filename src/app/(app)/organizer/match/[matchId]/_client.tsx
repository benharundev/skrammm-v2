"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowLeft, Zap, Clock, MapPin, User,
  RotateCcw, Lock, AlertTriangle, Play,
  Square, ChevronDown, X, Check, Droplets, Timer, Video,
} from "lucide-react";
import { v7 as uuidv7 } from "uuid";
import { EVENT_CONFIG, STAT_CONFIG, STAT_GROUPS } from "@/app/(app)/organizer/_lib/event-config";
import type { getMatchWithRoster } from "@modules/match";
import { useLiveClock } from "./_lib/use-live-clock";
import { useAnalystShortcuts } from "./_lib/use-analyst-shortcuts";
import { AnalystLayout } from "./_components/analyst-layout";
import { saveVideoUrlAction } from "./actions";
import type { PitchPin } from "./_components/pitch-svg";

// ── Local types ───────────────────────────────────────────────────────────────

type EventType = "try" | "conversion" | "penalty" | "drop_goal" | "yellow_card" | "red_card";
type StatType =
  | "kicks_from_hand" | "passes" | "runs" | "metres_run"
  | "possession_phase" | "territory_phase"
  | "clean_breaks" | "defenders_beaten" | "offloads"
  | "rucks_won" | "rucks_lost" | "mauls_won" | "mauls_lost"
  | "turnovers_conceded"
  | "tackles_made" | "tackles_missed"
  | "scrums_own_feed_won" | "scrums_own_feed_lost"
  | "lineouts_own_throw_won" | "lineouts_own_throw_lost"
  | "penalties_conceded"
  | "forward_pass" | "knock_on";
type MatchPhase = "pre_match" | "first_half" | "halftime" | "second_half" | "completed" | "suspended" | "locked";
type PauseType = "water_break" | "timeout" | "suspend";

interface MatchEvent {
  id: string;
  minute: number;
  team: "home" | "away";
  type: EventType;
  playerName: string;
  points: number;
}

interface PendingAction {
  team: "home" | "away";
  type: EventType;
  playerName: string;
  playerId: string | null;
  pitchX?: number;
  pitchY?: number;
  videoTimestampMs?: number;
}

interface AnalystTag {
  id: string;
  eventType: string;
  team: "home" | "away";
  label: string;
  colorClass: string;
  pitchX: number;
  pitchY: number;
  videoTimestampMs: number;
}

interface UndoItem {
  event: MatchEvent;
  timeout: ReturnType<typeof setTimeout>;
}

interface RosterPlayer {
  id: string;
  number: number;
  name: string;
  position: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<MatchPhase, string> = {
  pre_match: "Pre-Match",
  first_half: "1st Half",
  halftime: "Half Time",
  second_half: "2nd Half",
  completed: "Full Time",
  suspended: "Suspended",
  locked: "Locked",
};

const PHASE_NEXT: Partial<Record<MatchPhase, MatchPhase>> = {
  pre_match: "first_half",
  first_half: "halftime",
  halftime: "second_half",
  second_half: "completed",
  completed: "locked",
};

const PHASE_CTA: Partial<Record<MatchPhase, string>> = {
  pre_match: "Kick Off",
  first_half: "Half Time",
  halftime: "Start 2nd Half",
  second_half: "Full Time",
  completed: "Lock Result",
};

function dbStatusToPhase(status: string): MatchPhase {
  if (status === "live") return "first_half";
  if (status === "suspended") return "suspended";
  if (status === "completed") return "completed";
  if (status === "locked") return "locked";
  return "pre_match";
}

const UI_EVENT_TYPES = new Set<string>(["try", "conversion", "penalty", "drop_goal", "yellow_card", "red_card"]);

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoringButton({
  label, pts, disabled, onClick,
}: { label: string; pts: number; disabled?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1 h-20 border-2 rounded-sm transition-all active:translate-x-[3px] active:translate-y-[3px] ${disabled ? "border-border text-muted-foreground opacity-40 cursor-not-allowed" : "border-pitch-green text-pitch-green bg-pitch-green/5 hover:bg-pitch-green hover:text-white"}`}
      style={{ boxShadow: disabled ? "none" : "3px 3px 0 var(--navy)" }}>
      <span className="font-lexend text-base font-black">{label}</span>
      <span className="text-xs font-bold">+{pts}</span>
    </button>
  );
}

function CardButton({
  label, color, disabled, onClick,
}: { label: string; color: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center justify-center h-12 border-2 rounded-sm transition-all active:translate-x-[2px] active:translate-y-[2px] ${disabled ? "border-border opacity-40 cursor-not-allowed" : color}`}
      style={{ boxShadow: disabled ? "none" : "3px 3px 0 var(--navy)" }}>
      <span className="text-[13px] font-black">{label}</span>
    </button>
  );
}

function PlayerDropdown({
  roster, value, onChange, placeholder,
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
      <input value={value} onChange={e => onChange(null, e.target.value)} placeholder={placeholder}
        className="h-11 px-4 border-2 border-border bg-card rounded-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-fair-play-gold w-full text-[13px]" />
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} type="button"
        className={`flex items-center justify-between gap-2 h-11 px-4 border-2 rounded-sm w-full text-left transition-colors text-[13px] ${open ? "border-fair-play-gold" : "border-border hover:border-navy"} bg-card ${value ? "font-semibold text-foreground" : "font-normal text-muted-foreground"}`}>
        <span className="truncate">{display}</span>
        <ChevronDown size={14} className={`flex-shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border-2 border-border rounded-sm shadow-lg max-h-48 overflow-y-auto shadow-brutalist-navy">
          <button onClick={() => { onChange(null, ""); setOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors border-b border-border text-xs text-muted-foreground">
            Unknown player
          </button>
          {roster.map(p => (
            <button key={p.id} onClick={() => { onChange(p.id, p.name); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors text-[13px]">
              <span className="bg-pitch-green text-white w-7 h-5 rounded-sm flex items-center justify-center flex-shrink-0 font-lexend text-[10px] font-extrabold">
                {p.number}
              </span>
              <span className="text-foreground font-medium truncate">{p.name}</span>
              <span className="text-muted-foreground text-xs ml-auto">{p.position}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type MatchWithRoster = NonNullable<Awaited<ReturnType<typeof getMatchWithRoster>>>;

export function MatchCenterClient({ match }: { match: MatchWithRoster }) {
  const matchId = match.id;

  const homeRoster: RosterPlayer[] = match.homeTeam.players.map(p => ({
    id: p.id,
    number: p.jerseyNumber ?? 0,
    name: p.fullName,
    position: p.position ?? "",
  }));

  const awayRoster: RosterPlayer[] = match.awayTeam.players.map(p => ({
    id: p.id,
    number: p.jerseyNumber ?? 0,
    name: p.fullName,
    position: p.position ?? "",
  }));

  const allPlayers = [...homeRoster, ...awayRoster];

  function lookupPlayerName(playerId: string | null): string {
    if (!playerId) return "Unknown";
    return allPlayers.find(p => p.id === playerId)?.name ?? "Unknown";
  }

  function mapDbEvents(dbEvents: MatchWithRoster["events"]): MatchEvent[] {
    return dbEvents
      .filter(e => UI_EVENT_TYPES.has(e.eventType))
      .map(e => {
        const type = e.eventType as EventType;
        const team: "home" | "away" = e.teamId === match.homeTeam.id ? "home" : "away";
        return {
          id: e.id,
          minute: e.minute ?? 0,
          team,
          type,
          playerName: lookupPlayerName(e.playerId),
          points: EVENT_CONFIG[type]!?.points ?? 0,
        };
      })
      .reverse(); // newest first for display
  }

  const [phase, setPhase] = useState<MatchPhase>(dbStatusToPhase(match.status));
  const [homeScore, setHomeScore] = useState(match.homeScore);
  const [awayScore, setAwayScore] = useState(match.awayScore);
  const [startedAt, setStartedAt] = useState<Date | null>(match.startedAt ?? null);
  const [secondHalfStartedAt, setSecondHalfStartedAt] = useState<Date | null>(match.secondHalfStartedAt ?? null);
  const [pausedAt, setPausedAt] = useState<Date | null>(match.pausedAt ?? null);
  const [totalPausedMs, setTotalPausedMs] = useState(match.totalPausedMs);
  const [pauseType, setPauseType] = useState<PauseType | null>(null);
  const minute = useLiveClock(startedAt, secondHalfStartedAt, phase === "first_half" || phase === "second_half", pausedAt, totalPausedMs);
  const [events, setEvents] = useState<MatchEvent[]>(mapDbEvents(match.events));
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [undoItem, setUndoItem] = useState<UndoItem | null>(null);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [mobileTab, setMobileTab] = useState<"home" | "away">("home");
  const [statsTeam, setStatsTeam] = useState<"home" | "away">("home");
  const [prePhase, setPrePhase] = useState<MatchPhase | null>(null);
  const [analystMode, setAnalystMode] = useState(false);
  const [activeTeam, setActiveTeam] = useState<"home" | "away">("home");
  const [activeAction, setActiveAction] = useState<{ eventType: string; team: "home" | "away" } | null>(null);
  const [analystTags, setAnalystTags] = useState<AnalystTag[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(match.videoUrl ?? null);

  const isLocked = phase === "locked";
  const isSuspended = phase === "suspended";
  const canScore = (phase === "first_half" || phase === "second_half") && !isLocked && !isSuspended;

  const SCORING_EVENTS = new Set(["try", "conversion", "penalty", "drop_goal", "yellow_card", "red_card"]);

  function getTagLabel(eventType: string): { label: string; colorClass: string } {
    if (eventType in EVENT_CONFIG) {
      const cfg = EVENT_CONFIG[eventType as keyof typeof EVENT_CONFIG];
      return { label: cfg.label, colorClass: cfg.colorClass };
    }
    if (eventType in STAT_CONFIG) {
      const cfg = STAT_CONFIG[eventType as keyof typeof STAT_CONFIG];
      return { label: cfg.label, colorClass: "bg-navy/60 text-white" };
    }
    return { label: eventType.slice(0, 4).toUpperCase(), colorClass: "bg-muted text-foreground" };
  }

  useAnalystShortcuts({
    enabled: analystMode && canScore,
    activeTeam,
    onTeamChange: setActiveTeam,
    onActionSelect: (eventType) => setActiveAction({ eventType, team: activeTeam }),
    onCancel: () => setActiveAction(null),
  });

  function handlePitchClick(coords: { pitchX: number; pitchY: number }, videoTimestampMs: number) {
    if (!activeAction || !canScore) return;
    const { eventType, team } = activeAction;
    setActiveAction(null);

    if (SCORING_EVENTS.has(eventType)) {
      setPendingAction({
        team,
        type: eventType as EventType,
        playerName: "",
        playerId: null,
        pitchX: coords.pitchX,
        pitchY: coords.pitchY,
        videoTimestampMs,
      });
    } else {
      const { label, colorClass } = getTagLabel(eventType);
      const tagId = uuidv7();
      setAnalystTags(tags => [
        { id: tagId, eventType, team, label, colorClass, ...coords, videoTimestampMs },
        ...tags,
      ]);
      incrementStat(team, eventType as StatType, 1, {
        pitchX: coords.pitchX,
        pitchY: coords.pitchY,
        videoTimestampMs,
      });
    }
  }

  const pitchPins: PitchPin[] = analystTags.map(t => ({
    pitchX: t.pitchX,
    pitchY: t.pitchY,
    eventType: t.eventType,
    team: t.team,
  }));

  type StatsMap = Record<StatType, number>;
  const EMPTY_STATS: StatsMap = {
    kicks_from_hand: 0, passes: 0, runs: 0, metres_run: 0,
    possession_phase: 0, territory_phase: 0,
    clean_breaks: 0, defenders_beaten: 0, offloads: 0,
    rucks_won: 0, rucks_lost: 0, mauls_won: 0, mauls_lost: 0,
    turnovers_conceded: 0,
    tackles_made: 0, tackles_missed: 0,
    scrums_own_feed_won: 0, scrums_own_feed_lost: 0,
    lineouts_own_throw_won: 0, lineouts_own_throw_lost: 0,
    penalties_conceded: 0, forward_pass: 0, knock_on: 0,
  };

  function buildInitialStats(side: "home" | "away"): StatsMap {
    const teamId = side === "home" ? match.homeTeam.id : match.awayTeam.id;
    const counts = { ...EMPTY_STATS };
    for (const e of match.events) {
      if (e.teamId === teamId && e.eventType in counts) {
        const stat = e.eventType as StatType;
        if (stat === "metres_run") {
          const p = e.payload as { value?: number } | null;
          counts[stat] += p?.value ?? 1;
        } else {
          counts[stat] += 1;
        }
      }
    }
    return counts;
  }

  const [homeStats, setHomeStats] = useState<StatsMap>(() => buildInitialStats("home"));
  const [awayStats, setAwayStats] = useState<StatsMap>(() => buildInitialStats("away"));

  const currentHalf = (phase === "first_half" || phase === "halftime") ? 1 : 2;

  const incrementStat = (
    team: "home" | "away",
    stat: StatType,
    delta = 1,
    extraPayload?: Record<string, unknown>,
  ) => {
    if (!canScore) return;
    if (team === "home") setHomeStats(s => ({ ...s, [stat]: (s[stat] ?? 0) + delta }));
    else setAwayStats(s => ({ ...s, [stat]: (s[stat] ?? 0) + delta }));

    const teamId = team === "home" ? match.homeTeam.id : match.awayTeam.id;
    const payload: Record<string, unknown> = { ...extraPayload };
    if (delta !== 1) payload.value = delta;
    const body: Record<string, unknown> = { teamId, eventType: stat, minute };
    if (Object.keys(payload).length > 0) body.payload = payload;

    fetch(`/api/organizer/match/${matchId}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async res => {
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        if (team === "home") setHomeStats(s => ({ ...s, [stat]: (s[stat] ?? delta) - delta }));
        else setAwayStats(s => ({ ...s, [stat]: (s[stat] ?? delta) - delta }));
        toast.error(errData.error ?? "Failed to record stat");
      }
    }).catch(err => { console.error("[MatchCenter] stat POST failed:", err); });
  };

  const incrementPossession = (team: "home" | "away", stat: "possession_phase" | "territory_phase") => {
    incrementStat(team, stat, 1, { half: currentHalf });
  };

  const clearUndo = useCallback(() => {
    setUndoItem(prev => { if (prev) clearTimeout(prev.timeout); return null; });
  }, []);

  const initiateScore = (team: "home" | "away", type: EventType) => {
    if (!canScore) return;
    setPendingAction({ team, type, playerName: "", playerId: null });
  };

  const confirmScore = async () => {
    if (!pendingAction) return;
    const pts = EVENT_CONFIG[pendingAction.type]!.points;
    const teamSide = pendingAction.team;
    const eventType = pendingAction.type;
    const playerId = pendingAction.playerId;
    const optimisticId = uuidv7();
    const newEvent: MatchEvent = {
      id: optimisticId,
      minute,
      team: teamSide,
      type: eventType,
      playerName: pendingAction.playerName || "Unknown",
      points: pts,
    };

    if (teamSide === "home") setHomeScore(s => s + pts);
    else setAwayScore(s => s + pts);
    setEvents(ev => [newEvent, ...ev]);
    clearUndo();
    const t = setTimeout(() => setUndoItem(null), 8000);
    setUndoItem({ event: newEvent, timeout: t });
    setPendingAction(null);

    const teamId = teamSide === "home" ? match.homeTeam.id : match.awayTeam.id;
    const pitchPayload: Record<string, unknown> = {};
    if (pendingAction.pitchX !== undefined) pitchPayload.pitchX = pendingAction.pitchX;
    if (pendingAction.pitchY !== undefined) pitchPayload.pitchY = pendingAction.pitchY;
    if (pendingAction.videoTimestampMs !== undefined) pitchPayload.videoTimestampMs = pendingAction.videoTimestampMs;

    if (Object.keys(pitchPayload).length > 0) {
      const { label, colorClass } = getTagLabel(eventType);
      setAnalystTags(tags => [
        {
          id: optimisticId,
          eventType,
          team: teamSide,
          label,
          colorClass,
          pitchX: pendingAction.pitchX!,
          pitchY: pendingAction.pitchY!,
          videoTimestampMs: pendingAction.videoTimestampMs!,
        },
        ...tags,
      ]);
    }

    try {
      const res = await fetch(`/api/organizer/match/${matchId}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          eventType,
          minute,
          ...(playerId ? { playerId } : {}),
          ...(Object.keys(pitchPayload).length > 0 ? { payload: pitchPayload } : {}),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(errData.error ?? "Failed to record event");
      }
      const data = await res.json() as { ok: boolean; eventId?: string };
      if (data.eventId) {
        const serverId = data.eventId;
        setEvents(evs => evs.map(e => e.id === optimisticId ? { ...e, id: serverId } : e));
        setUndoItem(prev =>
          prev?.event.id === optimisticId ? { ...prev, event: { ...prev.event, id: serverId } } : prev
        );
      }
    } catch (err) {
      if (teamSide === "home") setHomeScore(s => s - pts);
      else setAwayScore(s => s - pts);
      setEvents(evs => evs.filter(e => e.id !== optimisticId));
      setAnalystTags(tags => tags.filter(t => t.id !== optimisticId));
      clearUndo();
      toast.error(err instanceof Error ? err.message : "Failed to record event");
    }
  };

  const undoLast = () => {
    if (!undoItem) return;
    const ev = undoItem.event;
    clearUndo();
    setEvents(evs => evs.filter(e => e.id !== ev.id));
    if (ev.team === "home") setHomeScore(s => s - ev.points);
    else setAwayScore(s => s - ev.points);

    // Fire-and-forget DELETE
    fetch(`/api/organizer/match/${matchId}/event`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: ev.id }),
    }).catch(err => { console.error("[MatchCenter] DELETE event failed:", err); });
  };

  async function postPhase(status: string): Promise<void> {
    const res = await fetch(`/api/organizer/match/${matchId}/phase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(data.error ?? "Phase update failed");
    }
  }

  const advancePhase = async () => {
    const prev = phase;
    const next = PHASE_NEXT[phase];
    if (!next) return;
    if (next === "locked") { setShowLockDialog(true); return; }
    setPhase(next);
    try {
      if (next === "first_half") {
        const now = new Date();
        await postPhase("live");
        setStartedAt(now);
      }
      if (next === "second_half") {
        const now = new Date();
        await postPhase("live"); // records secondHalfStartedAt on server
        setSecondHalfStartedAt(now);
        setTotalPausedMs(0);
        setPausedAt(null);
      }
      if (next === "completed") await postPhase("completed");
    } catch (err) {
      setPhase(prev);
      toast.error(err instanceof Error ? err.message : "Failed to update match phase");
    }
  };

  const pauseMatch = async (type: PauseType) => {
    const prev = phase;
    setShowSuspendDialog(false);
    setPrePhase(prev);
    setPhase("suspended");
    const now = new Date();
    setPausedAt(now);
    setPauseType(type);
    try {
      await postPhase("suspended");
    } catch (err) {
      setPhase(prev);
      setPausedAt(null);
      setPauseType(null);
      toast.error(err instanceof Error ? err.message : "Failed to pause match");
    }
  };

  const resume = async () => {
    const prev = phase;
    const next = prePhase ?? "second_half";
    const nowMs = Date.now();
    const additionalMs = pausedAt ? nowMs - pausedAt.getTime() : 0;
    setPhase(next);
    setPrePhase(null);
    setTotalPausedMs(t => t + additionalMs);
    setPausedAt(null);
    setPauseType(null);
    try {
      await postPhase("live");
    } catch (err) {
      setPhase(prev);
      setTotalPausedMs(t => t - additionalMs);
      setPausedAt(pausedAt);
      setPauseType(pauseType);
      toast.error(err instanceof Error ? err.message : "Failed to resume match");
    }
  };

  const lockResult = async () => {
    setShowLockDialog(false);
    setPhase("locked");
    try {
      await postPhase("locked");
    } catch (err) {
      setPhase("completed");
      toast.error(err instanceof Error ? err.message : "Failed to lock match");
    }
  };

  useEffect(() => { return () => { if (undoItem) clearTimeout(undoItem.timeout); }; }, [undoItem]);

  const homeName = match.homeTeam.name;
  const awayName = match.awayTeam.name;
  const homeShort = homeName.slice(0, 3).toUpperCase();
  const awayShort = awayName.slice(0, 3).toUpperCase();

  const ScoringPanel = ({ side }: { side: "home" | "away" }) => {
    const roster = side === "home" ? homeRoster : awayRoster;
    const label = side === "home" ? homeShort : awayShort;
    return (
      <div className="flex flex-col gap-3">
        <p className="text-center text-muted-foreground text-[11px] font-bold uppercase tracking-[0.06em]">
          {label} — Score
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(["try", "conversion", "penalty", "drop_goal"] as EventType[]).map(type => (
            <ScoringButton key={type} label={EVENT_CONFIG[type]!.label} pts={EVENT_CONFIG[type]!.points}
              disabled={!canScore || pendingAction !== null}
              onClick={() => initiateScore(side, type)} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["yellow_card", "red_card"] as EventType[]).map(type => (
            <CardButton key={type} label={EVENT_CONFIG[type]!.label}
              color={type === "yellow_card" ? "border-fair-play-gold text-pitch-green bg-fair-play-gold hover:bg-fair-play-gold/90" : "border-red-card text-white bg-red-card hover:bg-red-card/90"}
              disabled={!canScore || pendingAction !== null}
              onClick={() => initiateScore(side, type)} />
          ))}
        </div>
        {pendingAction?.team === side && (
          <div className="border-2 border-fair-play-gold rounded-sm p-3 bg-fair-play-gold/10 flex flex-col gap-3 shadow-brutalist-sm">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-sm text-xs font-black ${EVENT_CONFIG[pendingAction.type]!.colorClass}`}>
                {EVENT_CONFIG[pendingAction.type]!.label}
              </span>
              <span className="text-foreground text-[13px] font-bold">
                {pendingAction.type === "yellow_card" || pendingAction.type === "red_card" ? "Who received?" : "Who scored?"}
              </span>
            </div>
            <PlayerDropdown
              roster={roster}
              value={pendingAction.playerName}
              onChange={(id, name) => setPendingAction(a => a ? { ...a, playerName: name, playerId: id } : a)}
              placeholder="Select or type player…"
            />
            <div className="flex items-center gap-2">
              <button onClick={confirmScore}
                className="flex-1 flex items-center justify-center gap-1.5 bg-pitch-green text-white border-2 border-pitch-green h-10 rounded-sm hover:bg-pitch-green/90 transition-colors text-[13px] font-bold shadow-brutalist-navy-xs">
                <Check size={14} /> Confirm
              </button>
              <button onClick={() => setPendingAction(null)}
                className="px-4 h-10 border-2 border-border text-muted-foreground rounded-sm hover:border-navy transition-colors text-[13px]">
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const StatsPanel = ({ side }: { side: "home" | "away" }) => {
    const stats = side === "home" ? homeStats : awayStats;
    return (
      <div className="flex flex-col gap-4">
        {STAT_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-2">
              {group.label}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {group.stats.map(stat => {
                if (stat === "metres_run") {
                  return (
                    <div key={stat} className="col-span-2 border-2 border-border rounded-sm overflow-hidden"
                      style={{ boxShadow: canScore ? "2px 2px 0 var(--navy)" : "none" }}>
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/20">
                        <span className="text-[12px] font-medium text-foreground">Metres Run</span>
                        <span className="font-[family-name:var(--font-lexend)] text-sm font-black text-foreground">
                          {stats.metres_run}m
                        </span>
                      </div>
                      <div className="grid grid-cols-2 divide-x-2 divide-border border-t-2 border-border">
                        {([5, 10] as const).map(delta => (
                          <button key={delta} disabled={!canScore}
                            onClick={() => incrementStat(side, "metres_run", delta)}
                            className={`py-2.5 text-[13px] font-bold transition-colors ${
                              !canScore
                                ? "bg-card text-muted-foreground/40 cursor-not-allowed"
                                : "bg-card hover:bg-muted text-foreground active:translate-x-[1px] active:translate-y-[1px]"
                            }`}>
                            +{delta}m
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                const isPossession = stat === "possession_phase" || stat === "territory_phase";
                const label = isPossession
                  ? `${STAT_CONFIG[stat].full} H${currentHalf}`
                  : STAT_CONFIG[stat].full;
                return (
                  <button key={stat} disabled={!canScore}
                    onClick={() => isPossession
                      ? incrementPossession(side, stat)
                      : incrementStat(side, stat)
                    }
                    className={`flex flex-col items-start justify-between p-3 h-[72px] border-2 rounded-sm text-left transition-all active:translate-x-[1px] active:translate-y-[1px] ${
                      !canScore
                        ? "border-border opacity-40 cursor-not-allowed bg-card"
                        : "border-border hover:border-navy bg-card"
                    }`}
                    style={{ boxShadow: !canScore ? "none" : "2px 2px 0 var(--navy)" }}>
                    <span className="text-[11px] font-medium text-muted-foreground leading-tight">{label}</span>
                    <span className="font-[family-name:var(--font-lexend)] text-xl font-black text-foreground tabular-nums">
                      {stats[stat]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-pitch-green border-b-2 border-navy px-5 py-3 flex items-center gap-3 flex-shrink-0">
        <Link href="/organizer"
          className="h-8 w-8 border-2 border-white/30 rounded-sm flex items-center justify-center text-white hover:border-white hover:bg-white/10 transition-colors flex-shrink-0">
          <ArrowLeft size={14} />
        </Link>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            {match.groupLabel && (
              <span className="text-white/70 text-xs">Group {match.groupLabel}</span>
            )}
            {match.pitch && (
              <span className="flex items-center gap-1 text-white/60 text-xs"><MapPin size={10} />{match.pitch}</span>
            )}
            {match.refereeName && (
              <span className="flex items-center gap-1 text-white/60 text-xs"><User size={10} />{match.refereeName}</span>
            )}
          </div>
          <p className="text-white text-sm font-bold truncate font-lexend">
            {homeName} vs {awayName}
          </p>
        </div>
        <Link
          href={`/organizer/match/${match.id}/commentator` as Route}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold tracking-wide bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white flex-shrink-0"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Zap className="h-3.5 w-3.5" />
          COMMENTATOR VIEW
        </Link>
        <button
          onClick={() => { setAnalystMode(m => !m); setActiveAction(null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold tracking-wide rounded-lg transition-colors flex-shrink-0 ${
            analystMode
              ? "bg-fair-play-gold text-pitch-green"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
        >
          <Video className="h-3.5 w-3.5" />
          ANALYST
        </button>
        <span className={`px-2.5 py-1 rounded-sm border-2 flex-shrink-0 text-xs font-bold ${phase === "locked" ? "border-muted bg-muted text-muted-foreground" : phase === "suspended" ? "border-red-card bg-red-card/20 text-white" : phase === "first_half" || phase === "second_half" ? "border-fair-play-gold bg-fair-play-gold/20 text-fair-play-gold animate-pulse" : "border-white/30 bg-white/10 text-white/80"}`}>
          {PHASE_LABELS[phase]}
        </span>
      </div>

      {/* Pause banner — Water Break / Timeout / Suspend */}
      {isSuspended && (() => {
        const PAUSE_CONFIG: Record<PauseType, { bg: string; label: string; icon: React.ReactNode }> = {
          water_break: { bg: "bg-[#0ea5e9]", label: "Water Break",     icon: <Droplets size={16} className="text-white" /> },
          timeout:     { bg: "bg-navy",      label: "Team Timeout",     icon: <Timer size={16} className="text-white" /> },
          suspend:     { bg: "bg-red-card",  label: "Match Suspended",  icon: <AlertTriangle size={16} className="text-white" /> },
        };
        const cfg = PAUSE_CONFIG[pauseType ?? "suspend"];
        return (
          <div className={`${cfg.bg} border-b-2 border-black/10 px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0`}>
            <div className="flex items-center gap-2">
              {cfg.icon}
              <p className="text-white font-bold text-sm">{cfg.label}</p>
            </div>
            <button onClick={resume}
              className="flex items-center gap-1.5 bg-white text-foreground border-2 border-white px-3 h-8 rounded-sm hover:bg-white/90 transition-colors text-xs font-black">
              <Play size={12} /> Resume
            </button>
          </div>
        );
      })()}

      {/* Undo bar */}
      {undoItem && (
        <div className="bg-navy border-b-2 border-navy/60 px-5 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
          <p className="text-white text-sm">
            <span className={`inline-flex px-1.5 rounded mr-2 text-[11px] font-black ${EVENT_CONFIG[undoItem.event.type]!.colorClass}`}>
              {EVENT_CONFIG[undoItem.event.type]!.label}
            </span>
            {undoItem.event.playerName} — {undoItem.event.team === "home" ? homeShort : awayShort}
            {undoItem.event.points > 0 && <span className="text-fair-play-gold ml-1 font-bold">+{undoItem.event.points}</span>}
          </p>
          <button onClick={undoLast}
            className="flex items-center gap-1.5 bg-fair-play-gold text-pitch-green border-2 border-fair-play-gold px-3 h-8 rounded-sm hover:bg-fair-play-gold/90 transition-colors text-xs font-black">
            <RotateCcw size={12} /> Undo
          </button>
        </div>
      )}

      {/* Score strip */}
      <div className="bg-pitch-green/95 border-b-2 border-navy px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-end gap-1 flex-1 min-w-0">
            <p className="text-white truncate w-full text-right text-[13px] font-bold">{homeName}</p>
            <span className="text-fair-play-gold font-lexend text-[52px] font-black leading-none">{homeScore}</span>
          </div>
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <span className="text-white/40 font-lexend text-[28px] font-black">—</span>
            <span className={`flex items-center gap-1 px-2.5 h-7 border-2 rounded-sm text-xs font-bold tabular-nums ${canScore ? "border-fair-play-gold/50 text-fair-play-gold" : "border-white/20 text-white/40"}`}>
              <Clock size={11} /> {minute}&apos;
            </span>
          </div>
          <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
            <p className="text-white truncate w-full text-[13px] font-bold">{awayName}</p>
            <span className="text-fair-play-gold font-lexend text-[52px] font-black leading-none">{awayScore}</span>
          </div>
        </div>
      </div>

      {analystMode ? (
        <AnalystLayout
          videoUrl={videoUrl}
          activeAction={activeAction}
          activeTeam={activeTeam}
          pins={pitchPins}
          analystTags={analystTags}
          homeStats={homeStats}
          awayStats={awayStats}
          canScore={canScore}
          homeShort={homeShort}
          awayShort={awayShort}
          homeTeamName={homeName}
          awayTeamName={awayName}
          pendingAction={pendingAction}
          homeRoster={homeRoster}
          awayRoster={awayRoster}
          onTeamChange={setActiveTeam}
          onPitchClick={handlePitchClick}
          onUrlSave={async (url) => {
            setVideoUrl(url);
            await saveVideoUrlAction(matchId, url);
          }}
          onConfirm={confirmScore}
          onCancel={() => setPendingAction(null)}
          onPlayerSelect={(id, name) =>
            setPendingAction((a) => (a ? { ...a, playerName: name, playerId: id } : a))
          }
        />
      ) : (
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Mobile team tabs */}
        <div className="flex sm:hidden border-2 border-border rounded-sm overflow-hidden">
          {(["home", "away"] as const).map(side => (
            <button key={side} onClick={() => setMobileTab(side)}
              className={`flex-1 py-2.5 transition-colors text-[13px] font-bold ${mobileTab === side ? "bg-pitch-green text-white" : "bg-card text-foreground hover:bg-muted"}`}>
              {side === "home" ? homeShort : awayShort}
            </button>
          ))}
        </div>

        {/* Scoring panels */}
        <div className="sm:hidden">
          <ScoringPanel side={mobileTab} />
        </div>

        <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] gap-4">
          <ScoringPanel side="home" />
          <div className="w-px bg-border self-stretch" />
          <ScoringPanel side="away" />
        </div>

        {/* Performance Stats */}
        <div className="bg-card border-2 border-border rounded-sm p-4 shadow-brutalist-navy">
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground mb-3">
            Performance Stats
          </p>
          <div className="grid grid-cols-2 border-2 border-border rounded-sm overflow-hidden mb-4">
            {(["home", "away"] as const).map(side => (
              <button key={side} onClick={() => setStatsTeam(side)}
                className={`py-2.5 text-[13px] font-bold transition-colors ${
                  statsTeam === side
                    ? "bg-navy text-white"
                    : "bg-card text-foreground hover:bg-muted"
                }`}>
                {side === "home" ? homeName : awayName}
              </button>
            ))}
          </div>
          <StatsPanel side={statsTeam} />
        </div>

        {/* Phase controls */}
        {!isLocked && (
          <div className="bg-card border-2 border-border rounded-sm p-4 flex flex-col gap-3 shadow-brutalist-navy">
            <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-[0.06em]">Phase Controls</p>
            <div className="flex items-center gap-2 flex-wrap">
              {PHASE_CTA[phase] && (
                <button onClick={advancePhase}
                  className="flex items-center gap-2 bg-fair-play-gold text-pitch-green border-2 border-fair-play-gold px-4 h-11 rounded-sm hover:bg-fair-play-gold/90 transition-colors text-sm font-black shadow-brutalist-navy-sm">
                  {phase === "completed" ? <Lock size={15} /> : <Zap size={15} />}
                  {PHASE_CTA[phase]}
                </button>
              )}
              {!isSuspended && (phase === "first_half" || phase === "second_half") && (
                <>
                  <button onClick={() => void pauseMatch("water_break")}
                    className="flex items-center gap-2 border-2 border-[#0ea5e9] text-[#0ea5e9] px-4 h-11 rounded-sm hover:bg-[#0ea5e9]/10 transition-colors text-sm font-bold">
                    <Droplets size={14} /> Water Break
                  </button>
                  <button onClick={() => void pauseMatch("timeout")}
                    className="flex items-center gap-2 border-2 border-navy text-navy px-4 h-11 rounded-sm hover:bg-navy/10 transition-colors text-sm font-bold">
                    <Timer size={14} /> Timeout
                  </button>
                  <button onClick={() => setShowSuspendDialog(true)}
                    className="flex items-center gap-2 border-2 border-red-card text-red-card px-4 h-11 rounded-sm hover:bg-red-card/10 transition-colors text-sm font-bold">
                    <Square size={14} /> Suspend
                  </button>
                </>
              )}
              {isSuspended && (
                <button onClick={resume}
                  className="flex items-center gap-2 border-2 border-border text-foreground px-4 h-11 rounded-sm hover:border-navy transition-colors text-sm font-bold">
                  <Play size={14} /> Resume Match
                </button>
              )}
            </div>
          </div>
        )}

        {isLocked && (
          <div className="bg-pitch-green/10 border-2 border-pitch-green/30 rounded-sm px-5 py-4 flex items-center gap-3">
            <Lock size={18} className="text-pitch-green flex-shrink-0" />
            <p className="text-pitch-green font-bold text-sm">
              Result locked — {homeShort} {homeScore} – {awayScore} {awayShort}
            </p>
          </div>
        )}

        {/* Event log */}
        <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
          <div className="bg-pitch-green px-5 py-3.5 border-b-2 border-navy flex items-center justify-between">
            <p className="text-white font-lexend text-sm font-bold">Event Log</p>
            <span className="bg-fair-play-gold text-pitch-green px-2 py-0.5 rounded-sm text-[11px] font-bold">
              {events.length} events
            </span>
          </div>
          {events.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-muted-foreground italic text-[13px]">No events yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {events.map(ev => {
                const isHome = ev.team === "home";
                return (
                  <div key={ev.id} className={`px-5 py-3 flex items-center gap-3 ${isHome ? "" : "flex-row-reverse"}`}>
                    <span className="bg-pitch-green/10 text-pitch-green w-10 text-center rounded-sm flex-shrink-0 font-lexend text-xs font-extrabold">
                      {ev.minute}&apos;
                    </span>
                    <span className={`px-2 py-0.5 rounded-sm flex-shrink-0 text-[11px] font-black ${EVENT_CONFIG[ev.type]!.colorClass}`}>
                      {EVENT_CONFIG[ev.type]!.label}
                    </span>
                    <div className={`flex-1 min-w-0 ${isHome ? "" : "text-right"}`}>
                      <p className="text-foreground truncate text-[13px] font-semibold">{ev.playerName}</p>
                      <p className="text-muted-foreground text-[11px]">{isHome ? homeShort : awayShort}</p>
                    </div>
                    {ev.points > 0 && (
                      <span className="text-pitch-green flex-shrink-0 font-lexend text-sm font-extrabold">+{ev.points}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Suspend dialog */}
      {showSuspendDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card border-2 border-red-card rounded-sm p-6 flex flex-col gap-4 max-w-sm w-full shadow-brutalist-red-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle size={22} className="text-red-card flex-shrink-0" />
              <p className="font-lexend text-lg font-extrabold">Suspend Match?</p>
            </div>
            <p className="text-muted-foreground text-[13px]">
              Clock stops. Scoring disabled until you resume. Use for injuries, weather, or pitch issues.
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => void pauseMatch("suspend")}
                className="flex-1 bg-red-card text-white border-2 border-red-card h-11 rounded-sm hover:bg-red-card/90 transition-colors text-sm font-black">
                Suspend
              </button>
              <button onClick={() => setShowSuspendDialog(false)}
                className="flex-1 border-2 border-border text-foreground h-11 rounded-sm hover:border-navy transition-colors text-sm font-bold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock result dialog */}
      {showLockDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card border-2 border-pitch-green rounded-sm p-6 flex flex-col gap-4 max-w-sm w-full shadow-brutalist-green-lg">
            <div className="flex items-center gap-3">
              <Lock size={22} className="text-pitch-green flex-shrink-0" />
              <p className="font-lexend text-lg font-extrabold">Lock Final Result?</p>
            </div>
            <div className="bg-pitch-green/10 border-2 border-pitch-green/30 rounded-sm px-5 py-4 text-center">
              <p className="text-foreground font-lexend text-[28px] font-black">
                {homeScore} <span className="text-muted-foreground/50 text-xl">–</span> {awayScore}
              </p>
              <p className="text-muted-foreground text-xs">{homeName} vs {awayName}</p>
            </div>
            <p className="text-muted-foreground text-[13px]">
              Locking prevents further score changes. Standings will update automatically.
            </p>
            <div className="flex items-center gap-2">
              <button onClick={lockResult}
                className="flex-1 bg-pitch-green text-white border-2 border-pitch-green h-11 rounded-sm hover:bg-pitch-green/90 transition-colors text-sm font-black">
                Lock Result
              </button>
              <button onClick={() => setShowLockDialog(false)}
                className="flex-1 border-2 border-border text-foreground h-11 rounded-sm hover:border-navy transition-colors text-sm font-bold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
