export interface UIScheduleMatch {
  id: string;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  status: "live" | "upcoming" | "completed";
  groupLabel: string;
  refereeName: string;
  pitch: string;
  scheduledAt: string;
}
