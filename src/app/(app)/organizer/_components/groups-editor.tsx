"use client";

import { useState } from "react";
import {
  AlertTriangle, GripVertical, Pencil, Trash2, Plus, Save, RotateCcw,
} from "lucide-react";
import type { UITeam } from "./ui-team";

export function GroupsEditor({ teamList }: { teamList: UITeam[] }) {
  const initialGroupList = ["A", "B", "C", "D", "E", "F"];
  const initialAssignments = Object.fromEntries(teamList.map(t => [t.id, t.group]));

  const [groups, setGroups] = useState<string[]>(initialGroupList);
  const [assignments, setAssignments] = useState<Record<string, string>>(initialAssignments);
  const [savedGroups, setSavedGroups] = useState<string[]>(initialGroupList);
  const [savedAssignments, setSavedAssignments] = useState<Record<string, string>>(initialAssignments);
  const [editMode, setEditMode] = useState(false);
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<string | null>(null);
  const [movingTeamId, setMovingTeamId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const expectedPerGroup = Math.ceil(teamList.length / groups.length);
  const hasChanges = JSON.stringify({ groups, assignments }) !== JSON.stringify({ groups: savedGroups, assignments: savedAssignments });
  const unassignedTeams = teamList.filter(t => !assignments[t.id]);
  const pendingCount = teamList.filter(t => t.status === "pending").length;
  const incompleteGroups = groups.filter(g => {
    const approved = teamList.filter(t => assignments[t.id] === g && t.status === "approved").length;
    return approved < expectedPerGroup;
  });

  const getNextGroupId = () => {
    for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      if (!groups.includes(ch)) return ch;
    }
    return `G${groups.length + 1}`;
  };

  const addGroup = () => { const next = getNextGroupId(); setGroups(g => [...g, next]); setRenamingGroup(next); setRenameValue(next); setConfirmDeleteGroup(null); setMovingTeamId(null); };

  const commitRename = () => {
    if (!renamingGroup) return;
    const newName = renameValue.trim().toUpperCase().slice(0, 4);
    if (!newName || newName === renamingGroup || groups.includes(newName)) { setRenamingGroup(null); return; }
    setGroups(g => g.map(x => x === renamingGroup ? newName : x));
    setAssignments(a => { const u = { ...a }; for (const tid of Object.keys(u)) if (u[tid] === renamingGroup) u[tid] = newName; return u; });
    setRenamingGroup(null);
  };

  const requestDelete = (group: string) => {
    if (teamList.some(t => assignments[t.id] === group)) setConfirmDeleteGroup(group);
    else performDelete(group);
  };

  const performDelete = (group: string) => {
    setGroups(g => g.filter(x => x !== group));
    setAssignments(a => { const u = { ...a }; for (const tid of Object.keys(u)) if (u[tid] === group) u[tid] = ""; return u; });
    setConfirmDeleteGroup(null);
  };

  const moveTeam = (teamId: string, targetGroup: string) => setAssignments(a => ({ ...a, [teamId]: targetGroup }));

  const onDragStart = (e: React.DragEvent, teamId: string) => { e.dataTransfer.setData("teamId", teamId); e.dataTransfer.effectAllowed = "move"; setDragging(teamId); };
  const onDragEnd = () => { setDragging(null); setDragOver(null); };
  const onDragOver = (e: React.DragEvent, zoneId: string) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dragOver !== zoneId) setDragOver(zoneId); };
  const onDragLeave = (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); };
  const onDrop = (e: React.DragEvent, zoneId: string) => { e.preventDefault(); const teamId = e.dataTransfer.getData("teamId"); if (teamId) moveTeam(teamId, zoneId); setDragging(null); setDragOver(null); };

  const saveChanges = () => { setSavedGroups([...groups]); setSavedAssignments({ ...assignments }); setEditMode(false); setRenamingGroup(null); setMovingTeamId(null); setConfirmDeleteGroup(null); };
  const discardChanges = () => { setGroups([...savedGroups]); setAssignments({ ...savedAssignments }); setEditMode(false); setRenamingGroup(null); setMovingTeamId(null); setConfirmDeleteGroup(null); };

  const renderTeamRow = (team: UITeam, currentGroup: string) => {
    const isDraggingThis = dragging === team.id;
    const isMovingThis = movingTeamId === team.id;
    return (
      <div key={team.id}>
        <div draggable={editMode} onDragStart={e => editMode && onDragStart(e, team.id)} onDragEnd={onDragEnd}
          className={`flex items-center gap-2.5 px-4 py-2.5 transition-all select-none ${isDraggingThis ? "opacity-40 bg-fair-play-gold/10" : isMovingThis ? "bg-fair-play-gold/10" : "hover:bg-muted/40"} ${editMode ? "cursor-grab active:cursor-grabbing" : ""}`}>
          {editMode && <GripVertical size={13} className="text-muted-foreground/40 flex-shrink-0" />}
          <span className="bg-pitch-green text-white px-1.5 py-0.5 rounded-sm flex-shrink-0 min-w-[32px] text-center text-[10px] font-bold">
            {team.shortName}
          </span>
          <span className="flex-1 truncate text-foreground text-[13px] font-semibold">{team.name}</span>
          {team.status === "pending" && (
            <span className="bg-fair-play-gold/15 text-fair-play-gold-dark border border-fair-play-gold/30 px-1.5 py-0.5 rounded-sm flex-shrink-0 text-[10px] font-bold">
              Pending
            </span>
          )}
          {editMode && (
            <button onClick={() => setMovingTeamId(isMovingThis ? null : team.id)}
              className={`flex-shrink-0 px-2 h-7 border-2 rounded-sm transition-colors text-[11px] font-bold ${isMovingThis ? "border-fair-play-gold text-fair-play-gold-dark bg-fair-play-gold/10" : "border-border text-muted-foreground hover:border-navy hover:text-foreground"}`}>
              {isMovingThis ? "✕" : "⇄"}
            </button>
          )}
        </div>
        {isMovingThis && (
          <div className="mx-3 mb-2 mt-0.5 border-2 border-fair-play-gold rounded-sm bg-card p-3 flex flex-col gap-2">
            <p className="text-xs font-bold">Move <span className="text-pitch-green">{team.name}</span> to:</p>
            <div className="flex gap-2 flex-wrap">
              {groups.map(g => (
                <button key={g} onClick={() => { moveTeam(team.id, g); setMovingTeamId(null); }} disabled={g === currentGroup}
                  className={`w-11 h-11 border-2 rounded-sm transition-all font-lexend text-[15px] font-extrabold ${g === currentGroup ? "border-border text-muted-foreground opacity-40 cursor-not-allowed" : "border-pitch-green text-pitch-green hover:bg-pitch-green hover:text-white active:translate-x-[2px] active:translate-y-[2px]"}`}
                  style={{ boxShadow: g !== currentGroup ? "2px 2px 0 var(--navy)" : "none" }}>
                  {g}
                </button>
              ))}
              <button onClick={() => { moveTeam(team.id, ""); setMovingTeamId(null); }} disabled={currentGroup === ""}
                className="px-3 h-11 border-2 border-dashed border-border text-muted-foreground rounded-sm hover:border-navy hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold">
                Unassign
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGroupCard = (group: string) => {
    const groupTeams = teamList.filter(t => assignments[t.id] === group);
    const approvedCount = groupTeams.filter(t => t.status === "approved").length;
    const isIncomplete = approvedCount < expectedPerGroup;
    const isDropTarget = dragOver === group && dragging !== null && assignments[dragging] !== group;
    const isDeleting = confirmDeleteGroup === group;
    const isRenaming = renamingGroup === group;
    const emptySlots = Math.max(0, expectedPerGroup - groupTeams.length);

    return (
      <div key={group} onDragOver={e => editMode && onDragOver(e, group)} onDragLeave={onDragLeave} onDrop={e => editMode && onDrop(e, group)}
        className={`bg-card border-2 rounded-sm flex flex-col transition-all duration-150 ${isDropTarget ? "border-dashed border-pitch-green" : isIncomplete ? "border-fair-play-gold" : "border-border"}`}
        style={{ boxShadow: isDropTarget ? "0 0 0 4px color-mix(in srgb, var(--pitch-green) 15%, transparent)" : isIncomplete ? "4px 4px 0 var(--fair-play-gold)" : "4px 4px 0 var(--navy)" }}>
        <div className={`px-4 py-3 border-b-2 flex items-center gap-2 ${isDropTarget ? "border-pitch-green bg-pitch-green/5" : isIncomplete ? "border-fair-play-gold" : "border-border"}`}>
          {isRenaming ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value.toUpperCase().slice(0, 4))}
                onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingGroup(null); }} onBlur={commitRename}
                className="bg-pitch-green text-white w-16 h-8 text-center border-2 border-fair-play-gold rounded-sm outline-none font-lexend text-sm font-extrabold" />
              <span className="text-muted-foreground text-[11px]">Enter to save</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="bg-pitch-green text-white w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 font-lexend text-sm font-extrabold">
                {group}
              </span>
              <span className="text-foreground font-lexend text-sm font-bold">Group {group}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
            {isIncomplete && !isRenaming && <AlertTriangle size={13} className="text-fair-play-gold-dark" />}
            <span className={`px-2 py-0.5 rounded-sm text-[11px] font-bold ${isIncomplete ? "bg-fair-play-gold/20 text-fair-play-gold-dark border border-fair-play-gold/40" : "bg-muted text-muted-foreground"}`}>
              {approvedCount}/{expectedPerGroup}
            </span>
            {editMode && !isRenaming && !isDeleting && (
              <>
                <button onClick={() => { setRenamingGroup(group); setRenameValue(group); setConfirmDeleteGroup(null); setMovingTeamId(null); }}
                  className="h-7 w-7 border border-border rounded-sm flex items-center justify-center text-muted-foreground hover:border-navy hover:text-foreground transition-colors">
                  <Pencil size={11} />
                </button>
                <button onClick={() => requestDelete(group)}
                  className="h-7 w-7 border border-border rounded-sm flex items-center justify-center text-muted-foreground hover:border-red-card hover:text-red-card transition-colors">
                  <Trash2 size={11} />
                </button>
              </>
            )}
          </div>
        </div>
        {isDeleting && (
          <div className="px-4 py-3 bg-red-card/5 border-b-2 border-red-card/20 flex items-center gap-3">
            <p className="text-foreground flex-1 text-xs font-semibold">
              {groupTeams.length > 0 ? `${groupTeams.length} team${groupTeams.length !== 1 ? "s" : ""} will move to Unassigned` : "Delete this empty group?"}
            </p>
            <button onClick={() => performDelete(group)} className="px-3 h-7 bg-red-card text-white border border-red-card rounded-sm text-xs font-bold">
              Delete
            </button>
            <button onClick={() => setConfirmDeleteGroup(null)} className="px-3 h-7 border border-border text-muted-foreground rounded-sm hover:border-navy transition-colors text-xs">
              Cancel
            </button>
          </div>
        )}
        {isDropTarget && (
          <div className="px-4 py-2 bg-pitch-green/6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-pitch-green animate-pulse" />
            <span className="text-pitch-green text-xs font-bold">Drop to move to Group {group}</span>
          </div>
        )}
        <div className="flex flex-col py-1 min-h-[40px]">
          {groupTeams.map(t => renderTeamRow(t, group))}
          {!isDropTarget && emptySlots > 0 && Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`e${i}`} className="mx-3 my-1 border-2 border-dashed border-border/50 rounded-sm px-3 py-2.5 flex items-center gap-2.5">
              <div className="w-8 h-4 bg-muted/50 rounded-sm" />
              <span className="text-muted-foreground/50 italic text-xs">Awaiting team</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUnassignedPool = () => {
    const isDropTarget = dragOver === "" && dragging !== null;
    if (!editMode && unassignedTeams.length === 0) return null;
    return (
      <div onDragOver={e => editMode && onDragOver(e, "")} onDragLeave={onDragLeave} onDrop={e => editMode && onDrop(e, "")}
        className={`border-2 rounded-sm transition-all duration-150 ${isDropTarget ? "border-dashed border-pitch-green bg-pitch-green/5" : "border-dashed border-border"}`}>
        <div className="px-4 py-3 flex items-center gap-2 border-b border-border/40">
          <span className="text-muted-foreground font-lexend text-[13px] font-bold">Unassigned</span>
          <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-sm text-[11px] font-bold">{unassignedTeams.length}</span>
          {isDropTarget && <span className="ml-2 text-pitch-green text-xs font-bold">Drop here to unassign</span>}
        </div>
        <div className="p-3 flex flex-col gap-1.5">
          {unassignedTeams.length === 0 ? (
            <p className="text-muted-foreground/50 italic text-center py-2 text-xs">
              {editMode ? "Drag teams here to remove from a group" : "No unassigned teams"}
            </p>
          ) : unassignedTeams.map(team => (
            <div key={team.id} draggable={editMode} onDragStart={e => editMode && onDragStart(e, team.id)} onDragEnd={onDragEnd}
              className={`flex items-center gap-2.5 border border-border rounded-sm px-3 py-2.5 bg-background transition-all ${dragging === team.id ? "opacity-40" : "hover:border-navy"} ${editMode ? "cursor-grab active:cursor-grabbing" : ""}`}>
              {editMode && <GripVertical size={13} className="text-muted-foreground/40" />}
              <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm flex-shrink-0 min-w-[32px] text-center text-[10px] font-bold">
                {team.shortName}
              </span>
              <span className="flex-1 truncate text-muted-foreground text-[13px] font-semibold">{team.name}</span>
              {team.status === "pending" && (
                <span className="bg-fair-play-gold/15 text-fair-play-gold-dark border border-fair-play-gold/30 px-1.5 py-0.5 rounded-sm text-[10px] font-bold">
                  Pending
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {incompleteGroups.length > 0 && (
            <span className="bg-fair-play-gold/20 text-fair-play-gold-dark border border-fair-play-gold/40 px-2.5 py-1 rounded-sm text-xs font-bold">
              {incompleteGroups.length} incomplete group{incompleteGroups.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button onClick={discardChanges} className="flex items-center gap-1.5 border-2 border-border text-muted-foreground px-3 h-9 rounded-sm hover:border-navy transition-colors text-[13px] font-semibold">
                <RotateCcw size={13} /> Discard
              </button>
              <button onClick={saveChanges}
                className={`flex items-center gap-1.5 border-2 px-3 h-9 rounded-sm transition-all text-[13px] font-bold ${hasChanges ? "bg-pitch-green text-white border-pitch-green" : "bg-muted text-muted-foreground border-border"}`}
                style={{ boxShadow: hasChanges ? "3px 3px 0 var(--navy)" : "none" }}>
                <Save size={13} /> Save
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 border-2 border-navy text-navy px-3 h-9 rounded-sm hover:bg-navy hover:text-white transition-colors text-[13px] font-bold">
              <Pencil size={13} /> Edit Groups
            </button>
          )}
        </div>
      </div>

      {incompleteGroups.length > 0 && (
        <div className="bg-card border-2 border-fair-play-gold rounded-sm px-5 py-4 flex gap-3 shadow-brutalist">
          <AlertTriangle size={18} className="text-fair-play-gold-dark flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <p className="text-foreground font-lexend text-sm font-bold">
              {pendingCount} team{pendingCount !== 1 ? "s" : ""} pending approval — registration incomplete
            </p>
            <p className="text-muted-foreground text-[13px]">
              {incompleteGroups.map(g => { const cnt = teamList.filter(t => assignments[t.id] === g && t.status === "approved").length; return `Group ${g}: ${cnt}/${expectedPerGroup}`; }).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {editMode && (
        <div className="bg-pitch-green/5 border-2 border-pitch-green/30 rounded-sm px-4 py-3 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-pitch-green animate-pulse flex-shrink-0" />
          <p className="text-pitch-green text-[13px] font-semibold">
            Drag teams between groups, or use <strong>⇄</strong> to pick a group. Rename or delete groups with the icons in each header.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map(g => renderGroupCard(g))}
        {editMode && (
          <button onClick={addGroup} className="border-2 border-dashed border-border rounded-sm flex flex-col items-center justify-center gap-2 min-h-[120px] hover:border-pitch-green hover:bg-pitch-green/5 transition-colors group">
            <div className="w-10 h-10 rounded-sm border-2 border-dashed border-border group-hover:border-pitch-green flex items-center justify-center transition-colors">
              <Plus size={20} className="text-muted-foreground group-hover:text-pitch-green transition-colors" />
            </div>
            <span className="text-muted-foreground group-hover:text-pitch-green transition-colors text-[13px] font-bold">Add Group</span>
          </button>
        )}
      </div>
      {renderUnassignedPool()}
    </div>
  );
}
