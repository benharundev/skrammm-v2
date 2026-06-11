"use client";

import { useState, useCallback, useTransition } from "react";
import { Filter, Save, RotateCcw, Zap, CheckCircle2, CalendarClock } from "lucide-react";
import type { UIScheduleMatch } from "@/app/(app)/organizer/_components/ui-schedule-match";
import { MatchRow, type EditState } from "@/app/(app)/organizer/_components/match-row";
import { saveMatchMetadataAction } from "./actions";
import { startMatchAction } from "../actions";

type StatusFilter = UIScheduleMatch["status"] | "all";
type GroupFilter = string;

const GROUPS = ["All", "A", "B", "C", "D", "E", "F"];
const STATUS_FILTERS: { key: StatusFilter; label: string; icon: React.ComponentType<{ size: number }> }[] = [
  { key: "all",       label: "All",       icon: Filter },
  { key: "live",      label: "Live",      icon: Zap },
  { key: "upcoming",  label: "Upcoming",  icon: CalendarClock },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
];

const defaultEditState: EditState = { referee: "", venue: "", scheduledTime: "" };

interface Props {
  matches: UIScheduleMatch[];
}

export function ScheduleClient({ matches }: Props) {
  const [, startTransition] = useTransition();
  const [, startMatchTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editStates, setEditStates] = useState<Record<string, EditState>>(
    Object.fromEntries(matches.map(m => [m.id, { referee: m.refereeName, venue: m.pitch, scheduledTime: m.scheduledAt }]))
  );
  const [savedStates] = useState<Record<string, EditState>>(
    Object.fromEntries(matches.map(m => [m.id, { referee: m.refereeName, venue: m.pitch, scheduledTime: m.scheduledAt }]))
  );
  const [savedEdits, setSavedEdits] = useState<Record<string, EditState>>({});

  const isEdited = useCallback((id: string): boolean => {
    const cur = editStates[id];
    const sav = savedEdits[id] ?? savedStates[id];
    if (!cur || !sav) return false;
    return cur.referee !== sav.referee || cur.venue !== sav.venue || cur.scheduledTime !== sav.scheduledTime;
  }, [editStates, savedEdits, savedStates]);

  const editedCount = matches.filter(m => isEdited(m.id)).length;

  const filtered = matches.filter(m => {
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    const matchGroup = groupFilter === "All" || m.groupLabel === groupFilter;
    return matchStatus && matchGroup;
  });

  const counts: Record<StatusFilter, number> = {
    all: matches.length,
    live: matches.filter(m => m.status === "live").length,
    upcoming: matches.filter(m => m.status === "upcoming").length,
    completed: matches.filter(m => m.status === "completed").length,
  };

  const handleEditChange = (id: string, key: keyof EditState, value: string) => {
    setEditStates(prev => ({ ...prev, [id]: { ...(prev[id] ?? defaultEditState), [key]: value } }));
  };

  const handleSave = (id: string) => {
    const current = editStates[id] ?? defaultEditState;
    const prev = savedEdits[id] ?? savedStates[id];
    setExpandedId(null);
    startTransition(() => {
      saveMatchMetadataAction(id, { referee: current.referee, venue: current.venue, scheduledTime: current.scheduledTime })
        .then(() => { setSavedEdits(s => ({ ...s, [id]: current })); })
        .catch(() => {
          // Rollback to previous saved state so the match stays marked as edited
          setSavedEdits(s => ({ ...s, ...(prev ? { [id]: prev } : {}) }));
        });
    });
  };

  const handleDiscard = (id: string) => {
    const original = savedEdits[id] ?? savedStates[id];
    if (original) setEditStates(prev => ({ ...prev, [id]: original }));
    setExpandedId(null);
  };

  const discardAll = () => {
    setEditStates(Object.fromEntries(matches.map(m => [m.id, savedStates[m.id] ?? defaultEditState])));
    setSavedEdits({});
    setExpandedId(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-background border-b-2 border-border px-6 h-14 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold">Fixtures</h1>
          <p className="text-muted-foreground text-xs">
            {counts.live} live · {counts.upcoming} upcoming · {counts.completed} completed
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {editedCount > 0 && (
          <div className="border-b-2 border-fair-play-gold bg-fair-play-gold/10 px-6 py-3 flex items-center justify-between gap-3 flex-shrink-0">
            <p className="text-fair-play-gold-dark text-[13px] font-bold">
              {editedCount} fixture{editedCount !== 1 ? "s" : ""} edited — unsaved changes
            </p>
            <div className="flex items-center gap-2">
              <button onClick={discardAll}
                className="flex items-center gap-1.5 border-2 border-fair-play-gold text-fair-play-gold-dark px-3 h-8 rounded-sm hover:bg-fair-play-gold/20 transition-colors text-xs font-bold">
                <RotateCcw size={12} /> Discard All
              </button>
              <button
                onClick={() => { matches.filter(m => isEdited(m.id)).forEach(m => { handleSave(m.id); }); }}
                className="flex items-center gap-1.5 bg-pitch-green text-white border-2 border-pitch-green px-3 h-8 rounded-sm text-xs font-bold shadow-brutalist-navy-xs">
                <Save size={12} /> Save All
              </button>
            </div>
          </div>
        )}

        <div className="px-6 pt-4 pb-2 flex flex-col gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {STATUS_FILTERS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setStatusFilter(key)}
                className={`flex items-center gap-1.5 px-4 h-9 rounded-sm border-2 whitespace-nowrap transition-colors text-[13px] font-bold ${statusFilter === key ? "bg-pitch-green text-white border-pitch-green" : "bg-card border-border text-foreground hover:border-navy"}`}>
                <Icon size={13} />
                {label}
                <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${statusFilter === key ? "bg-fair-play-gold text-pitch-green" : "bg-muted text-muted-foreground"}`}>{counts[key]}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {GROUPS.map(g => (
              <button key={g} onClick={() => setGroupFilter(g)}
                className={`px-3 h-8 rounded-sm border-2 transition-colors text-xs font-bold ${groupFilter === g ? "bg-pitch-green text-white border-pitch-green" : "border-border text-foreground hover:border-navy"}`}>
                {g === "All" ? "All Groups" : `Group ${g}`}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 flex-1">
          <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Filter size={32} className="text-muted-foreground/40" />
                <p className="text-muted-foreground text-sm">No fixtures match this filter.</p>
              </div>
            ) : (
              filtered.map(match => (
                <MatchRow key={match.id} match={match}
                  edited={isEdited(match.id)}
                  editState={editStates[match.id] ?? { referee: match.refereeName, venue: match.pitch, scheduledTime: match.scheduledAt }}
                  expanded={expandedId === match.id}
                  onToggleExpand={() => setExpandedId(expandedId === match.id ? null : match.id)}
                  onEditChange={(key, val) => handleEditChange(match.id, key, val)}
                  onSave={() => handleSave(match.id)}
                  onDiscard={() => handleDiscard(match.id)}
                  onStart={() => startMatchTransition(() => { void startMatchAction(match.id); })} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
