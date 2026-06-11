// Public surface — the only cross-module import point for the tournament domain
export {
  createTournament,
  getTournamentByCode,
  getTournamentPublic,
  approveTournamentTeam,
  listPendingTeams,
  getOrganizerTournament,
  getOrganizerWithTeams,
  getApprovedTeams,
  updateTournamentSettings,
  getTournamentById,
} from "./service";

export {
  TournamentFormatSchema,
  TournamentStatusSchema,
  CreateTournamentSchema,
  ApproveTournamentTeamSchema,
  inferFormat,
  RESERVED_CODES,
} from "./types";

export type {
  CreateTournamentInput,
  ApproveTournamentTeamInput,
  UpdateTournamentSettingsInput,
} from "./types";
