import type { UIScheduleMatch } from "./ui-schedule-match";

export function StatusBadge({ status }: { status: UIScheduleMatch["status"] }) {
  if (status === "live") return (
    <span className="flex items-center gap-1 bg-red-card text-white px-2 py-0.5 rounded-sm text-[11px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
    </span>
  );
  if (status === "completed") return (
    <span className="bg-pitch-green/15 text-pitch-green border border-pitch-green/30 px-2 py-0.5 rounded-sm text-[11px] font-bold">FT</span>
  );
  return (
    <span className="bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-sm text-[11px] font-semibold">Upcoming</span>
  );
}
