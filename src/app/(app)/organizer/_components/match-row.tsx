import Link from "next/link";
import { Clock, MapPin, User, Zap, Pencil, X, ChevronDown, Save, RotateCcw, FileText } from "lucide-react";
import type { UIScheduleMatch } from "./ui-schedule-match";
import { StatusBadge } from "./status-badge";

export interface EditState {
  referee: string;
  venue: string;
  scheduledTime: string;
}

interface Props {
  match: UIScheduleMatch;
  edited: boolean;
  editState: EditState;
  expanded: boolean;
  onToggleExpand: () => void;
  onEditChange: (key: keyof EditState, value: string) => void;
  onSave: () => void;
  onDiscard: () => void;
  onStart?: () => void;
}

export function MatchRow({
  match, edited, editState, expanded,
  onToggleExpand, onEditChange, onSave, onDiscard, onStart,
}: Props) {
  const homeShort = match.homeName.split(" ")[0]?.toUpperCase() ?? match.homeName;
  const awayShort = match.awayName.split(" ")[0]?.toUpperCase() ?? match.awayName;
  const homeName = match.homeName;
  const awayName = match.awayName;
  const isLive = match.status === "live";
  const isDone = match.status === "completed";

  return (
    <div className={`border-b border-border last:border-0 transition-colors ${expanded ? "bg-fair-play-gold/5" : "hover:bg-muted/30"}`}>
      {/* Desktop row */}
      <div className="hidden sm:grid grid-cols-[1fr_2fr_1fr] items-center gap-4 px-5 py-3.5 group">
        {/* Left Info */}
        <div className="flex items-center gap-3">
          <div className="w-20 flex-shrink-0"><StatusBadge status={match.status} /></div>
          <span className="w-8 bg-pitch-green/10 text-pitch-green px-1.5 py-0.5 rounded-sm text-center flex-shrink-0 text-[11px] font-bold">Grp {match.groupLabel}</span>
          <div className="hidden md:flex flex-col text-muted-foreground min-w-0">
            <span className="text-[10px] uppercase font-bold truncate">{editState.scheduledTime}</span>
            <span className="text-[10px] truncate">{editState.venue}</span>
          </div>
        </div>

        {/* Center Fixture */}
        <div className="flex items-center justify-center gap-3 min-w-0">
          <span className="text-right truncate flex-1 text-sm font-semibold">{homeName}</span>
          {isLive || isDone ? (
            <span className="flex-shrink-0 flex items-center gap-1.5 font-lexend text-base font-extrabold px-2">
              <span className={isLive ? "text-red-card" : "text-foreground"}>{match.homeScore}</span>
              <span className="text-muted-foreground/50">–</span>
              <span className={isLive ? "text-red-card" : "text-foreground"}>{match.awayScore}</span>
            </span>
          ) : (
            <span className="flex-shrink-0 text-muted-foreground px-4 text-[13px] font-black uppercase tracking-widest italic">vs</span>
          )}
          <span className="text-left truncate flex-1 text-sm font-semibold">{awayName}</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center justify-end gap-2">
          {edited && (
            <span className="hidden lg:inline-block bg-fair-play-gold/20 text-fair-play-gold-dark border border-fair-play-gold/30 px-2 py-0.5 rounded-sm flex-shrink-0 text-[10px] font-bold">Edited</span>
          )}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {match.status === "live" && (
              <Link href={`/organizer/match/${match.id}`}
                className="flex items-center gap-1 bg-red-card text-white px-3 h-8 rounded-sm border-2 border-red-card hover:bg-red-card/90 transition-colors text-xs font-bold">
                <Zap size={12} /> <span className="hidden md:inline">Manage</span>
              </Link>
            )}
            {!isLive && !isDone && onStart && (
              <button onClick={onStart}
                className="flex items-center gap-1 border-2 border-navy text-navy px-3 h-8 rounded-sm hover:bg-navy hover:text-white transition-colors text-xs font-bold">
                Start
              </button>
            )}
            <Link href={`/organizer/match/${match.id}/report`}
              className="flex items-center gap-1 border-2 border-border text-foreground px-3 h-8 rounded-sm hover:border-navy transition-colors text-xs font-bold">
              <FileText size={12} /> <span className="hidden md:inline">Details</span>
            </Link>
            <button onClick={onToggleExpand}
              className={`h-8 w-8 border-2 rounded-sm flex items-center justify-center transition-all ${expanded ? "border-fair-play-gold text-fair-play-gold-dark bg-fair-play-gold/10" : "border-border text-muted-foreground opacity-0 group-hover:opacity-100 hover:border-navy hover:text-foreground"}`}>
              {expanded ? <X size={13} /> : <Pencil size={13} />}
            </button>
            <button onClick={onToggleExpand}
              className={`h-8 w-8 border-2 rounded-sm flex items-center justify-center transition-all ${expanded ? "border-fair-play-gold text-fair-play-gold-dark rotate-180 bg-fair-play-gold/10" : "border-border text-muted-foreground hover:border-navy hover:text-foreground"}`}>
              <ChevronDown size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile card */}
      <div className="sm:hidden px-4 py-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={match.status} />
          <span className="bg-pitch-green/10 text-pitch-green px-1.5 py-0.5 rounded-sm text-[11px] font-bold">Grp {match.groupLabel}</span>
          {edited && (
            <span className="bg-fair-play-gold/20 text-fair-play-gold-dark border border-fair-play-gold/30 px-2 py-0.5 rounded-sm ml-auto text-[11px] font-bold">Edited</span>
          )}
          <button onClick={onToggleExpand}
            className={`h-7 w-7 border-2 rounded-sm flex items-center justify-center transition-colors ${expanded ? "border-fair-play-gold text-fair-play-gold-dark" : "border-border text-muted-foreground"}`}>
            <Pencil size={12} />
          </button>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-right flex-1 truncate text-sm font-bold">{homeShort}</span>
          {isLive || isDone ? (
            <span className="flex items-center gap-1 font-lexend text-lg font-black">
              <span className={isLive ? "text-red-card" : ""}>{match.homeScore}</span>
              <span className="text-muted-foreground/40">–</span>
              <span className={isLive ? "text-red-card" : ""}>{match.awayScore}</span>
            </span>
          ) : (
            <span className="text-muted-foreground text-[13px]">vs</span>
          )}
          <span className="text-left flex-1 truncate text-sm font-bold">{awayShort}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-muted-foreground"><Clock size={11} /><span className="text-[11px]">{editState.scheduledTime}</span></span>
          <span className="flex items-center gap-1 text-muted-foreground"><MapPin size={11} /><span className="text-[11px]">{editState.venue}</span></span>
        </div>
        <div className="flex items-center gap-2">
          {match.status === "live" && (
            <Link href={`/organizer/match/${match.id}`}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-card text-white h-9 rounded-sm border-2 border-red-card text-[13px] font-bold">
              <Zap size={13} /> Manage Match
            </Link>
          )}
          {!isLive && !isDone && onStart && (
            <button onClick={onStart}
              className="flex-1 flex items-center justify-center gap-1.5 border-2 border-navy text-navy h-9 rounded-sm hover:bg-navy hover:text-white transition-colors text-[13px] font-bold">
              Start
            </button>
          )}
          <Link href={`/organizer/match/${match.id}/report`}
            className="flex-1 flex items-center justify-center gap-1.5 border-2 border-border text-foreground h-9 rounded-sm hover:border-navy transition-colors text-[13px] font-bold">
            <FileText size={13} /> Details
          </Link>
        </div>
      </div>

      {/* Inline edit panel */}
      {expanded && (
        <div className="border-t-2 border-fair-play-gold/40 bg-fair-play-gold/5 px-5 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {([
              { key: "referee" as const,       label: "Referee",        icon: User,   placeholder: "Referee name" },
              { key: "venue" as const,         label: "Venue",          icon: MapPin, placeholder: "Pitch / location" },
              { key: "scheduledTime" as const, label: "Scheduled Time", icon: Clock,  placeholder: "HH:MM" },
            ]).map(({ key, label, icon: Icon, placeholder }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-bold uppercase tracking-[0.05em]">
                  <Icon size={11} />{label}
                </label>
                <input value={key === "referee" ? (editState.referee ?? "") : editState[key]}
                  onChange={e => onEditChange(key, e.target.value)}
                  placeholder={placeholder}
                  className="h-10 px-3 border-2 border-border bg-card rounded-sm text-foreground text-[13px] placeholder:text-muted-foreground outline-none focus:border-fair-play-gold" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onSave}
              className="flex items-center gap-1.5 bg-pitch-green text-white border-2 border-pitch-green px-4 h-9 rounded-sm hover:bg-pitch-green/90 transition-colors text-[13px] font-bold shadow-brutalist-navy-sm">
              <Save size={13} /> Save Fixture
            </button>
            <button onClick={onDiscard}
              className="flex items-center gap-1.5 border-2 border-border text-muted-foreground px-4 h-9 rounded-sm hover:border-navy hover:text-foreground transition-colors text-[13px]">
              <RotateCcw size={13} /> Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
