export interface UITeam {
  id: string;
  name: string;
  shortName: string;
  manager: string;
  managerEmail: string;
  rosterCount: number;
  group: string;
  status: "pending" | "approved" | "rejected";
}
