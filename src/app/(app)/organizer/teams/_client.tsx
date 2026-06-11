"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, CheckCircle, Users, ChevronRight } from "lucide-react";
import type { UITeam } from "../_components/ui-team";
import { PageHeader } from "@/app/(app)/organizer/_components/page-header";
import { PendingApprovalCard } from "@/app/(app)/organizer/_components/pending-approval-card";
import { GroupsEditor } from "@/app/(app)/organizer/_components/groups-editor";
import { approveTeamAction, rejectTeamAction } from "./actions";

type Tab = "pending" | "approved" | "groups";
const GROUPS = ["All", "A", "B", "C", "D", "E", "F"];

export function TeamsClient({ teams }: { teams: UITeam[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");
  const [teamList, setTeamList] = useState<UITeam[]>(teams);

  const pending = teamList.filter(t => t.status === "pending");
  const approved = teamList.filter(t => t.status === "approved");

  const displayed = (tab === "pending" ? pending : tab === "approved" ? approved : []).filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.manager.toLowerCase().includes(search.toLowerCase());
    const matchGroup = groupFilter === "All" || t.group === groupFilter;
    return matchSearch && matchGroup;
  });

  const approve = (id: string) => {
    const prev = teamList.find(t => t.id === id)?.status;
    setTeamList(list => list.map(t => t.id === id ? { ...t, status: "approved" } : t));
    startTransition(() => {
      approveTeamAction(id).catch(() => {
        setTeamList(list => list.map(t => t.id === id ? { ...t, status: prev ?? t.status } : t));
      });
    });
  };

  const reject = (id: string) => {
    const prev = teamList.find(t => t.id === id)?.status;
    setTeamList(list => list.map(t => t.id === id ? { ...t, status: "rejected" } : t));
    startTransition(() => {
      rejectTeamAction(id).catch(() => {
        setTeamList(list => list.map(t => t.id === id ? { ...t, status: prev ?? t.status } : t));
      });
    });
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "pending",  label: "Pending Approval", count: pending.length },
    { key: "approved", label: "Approved Teams",   count: approved.length },
    { key: "groups",   label: "Groups" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden" aria-busy={isPending}>
      <PageHeader title="Teams" sub={`${approved.length} approved · ${pending.length} pending`} />
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">

        <div className="flex items-center gap-0 border-2 border-border rounded-sm overflow-hidden self-start">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 flex items-center gap-2 transition-colors text-sm font-bold ${tab === t.key ? "bg-pitch-green text-white" : "bg-card text-foreground hover:bg-muted"}`}>
              {t.label}
              {t.count !== undefined && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${tab === t.key ? "bg-fair-play-gold text-pitch-green" : "bg-muted text-muted-foreground"}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {tab !== "groups" && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative w-full sm:flex-1 sm:max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teams or managers…"
                className="w-full h-10 pl-9 pr-4 border-2 border-border bg-card rounded-sm text-foreground text-[13px] placeholder:text-muted-foreground outline-none focus:border-pitch-green" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {GROUPS.map(g => (
                <button key={g} onClick={() => setGroupFilter(g)}
                  className={`px-3 py-1.5 rounded-sm border-2 transition-colors text-xs font-bold ${groupFilter === g ? "bg-pitch-green text-white border-pitch-green" : "border-border text-foreground hover:border-navy"}`}>
                  {g === "All" ? "All Groups" : `Grp ${g}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "pending" && (
          displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <CheckCircle size={40} className="text-pitch-green/40" />
              <p className="text-foreground font-lexend text-lg font-bold">All caught up!</p>
              <p className="text-muted-foreground text-sm">No teams pending approval.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayed.map(team => (
                <PendingApprovalCard key={team.id} team={team} variant="full" onApprove={() => approve(team.id)} onReject={() => reject(team.id)} />
              ))}
            </div>
          )
        )}

        {tab === "approved" && (
          <div className="bg-card border-2 border-border rounded-sm overflow-x-auto shadow-brutalist-navy">
            <table className="w-full">
              <thead>
                <tr className="bg-pitch-green text-white border-b-2 border-navy">
                  {["Team", "Group", "Manager", "Email", "Roster", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.05em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayed.map(team => (
                  <tr key={team.id} className="hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => router.push(`/organizer/teams/${team.id}`)}>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold">{team.name}</span>
                      <span className="ml-2 text-muted-foreground text-[11px]">({team.shortName})</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-pitch-green text-white px-2 py-0.5 rounded-sm text-xs font-bold">Grp {team.group}</span>
                    </td>
                    <td className="px-4 py-3 text-foreground text-[13px]">{team.manager}</td>
                    <td className="px-4 py-3 text-muted-foreground text-[13px]">{team.managerEmail}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-foreground text-[13px]">
                        <Users size={13} className="text-muted-foreground" /> {team.rosterCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-pitch-green-container text-pitch-green px-2 py-0.5 rounded-full text-[11px] font-bold">Approved</span>
                    </td>
                    <td className="px-4 py-3"><ChevronRight size={15} className="text-muted-foreground" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "groups" && <GroupsEditor teamList={teamList} />}
      </div>
    </div>
  );
}
