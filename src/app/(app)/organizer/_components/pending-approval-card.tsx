import Link from "next/link";
import { CheckCircle, XCircle, Users, Mail } from "lucide-react";
import type { UITeam } from "./ui-team";

interface Props {
  team: UITeam;
  variant: "compact" | "full";
  onApprove?: () => void;
  onReject?: () => void;
}

export function PendingApprovalCard({ team, variant, onApprove, onReject }: Props) {
  if (variant === "compact") {
    return (
      <div className="border-2 border-border rounded-sm p-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-foreground text-[13px] font-bold">{team.name}</p>
            <p className="text-muted-foreground text-[11px]">
              {team.manager} · {team.rosterCount} players
            </p>
          </div>
          <span className="text-muted-foreground uppercase text-[10px] font-bold">
            Grp {team.group}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={onApprove} className="flex-1 bg-pitch-green text-white border-2 border-pitch-green py-1.5 rounded-sm hover:bg-pitch-green/90 transition-colors text-xs font-bold shadow-brutalist-navy-xs">
            ✓ Approve
          </button>
          <button onClick={onReject} className="px-3 border-2 border-border text-muted-foreground py-1.5 rounded-sm hover:border-red-card hover:text-red-card transition-colors text-xs font-bold">
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/organizer/teams/${team.id}`}
      className="bg-card border-2 border-fair-play-gold rounded-sm block hover:shadow-none transition-shadow shadow-brutalist-dark">
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-foreground font-lexend text-base font-bold">{team.name}</p>
            <p className="text-muted-foreground text-xs">{team.shortName}</p>
          </div>
          <span className="bg-fair-play-gold text-pitch-green px-2 py-0.5 rounded-sm text-xs font-bold">
            Grp {team.group}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          {([
            { icon: Users,  text: `${team.manager} (Manager)` },
            { icon: Mail,   text: team.managerEmail },
            { icon: Users,  text: `${team.rosterCount} players registered` },
          ] as { icon: React.ComponentType<{ size: number; className: string }>; text: string }[]).map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-muted-foreground">
              <Icon size={13} className="flex-shrink-0" />
              <span className="text-xs">{text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t-2 border-border p-3 flex gap-2" onClick={e => e.preventDefault()}>
        <button onClick={e => { e.preventDefault(); onApprove?.(); }}
          className="flex-1 flex items-center justify-center gap-1.5 bg-pitch-green text-white border-2 border-pitch-green h-10 rounded-sm hover:bg-pitch-green/90 transition-colors text-[13px] font-bold shadow-brutalist-navy-xs">
          <CheckCircle size={14} /> Approve
        </button>
        <button onClick={e => { e.preventDefault(); onReject?.(); }}
          className="px-4 flex items-center justify-center gap-1.5 border-2 border-border text-muted-foreground h-10 rounded-sm hover:border-red-card hover:text-red-card transition-colors text-[13px] font-bold">
          <XCircle size={14} /> Reject
        </button>
      </div>
    </Link>
  );
}
