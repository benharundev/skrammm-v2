import { cache } from "react";
import {
  createTeam,
  getTeamById,
  joinTournament,
  getTeamsByManager,
  getManagerTeam as _getManagerTeam,
  joinTournamentByCode,
  updateTeamSettings,
  hasTeamTournaments,
  updateTeamLogo,
} from "./service";

export { createTeam, getTeamById, joinTournament, getTeamsByManager, joinTournamentByCode, updateTeamSettings, hasTeamTournaments, updateTeamLogo };
export const getManagerTeam = cache(_getManagerTeam);
export { CreateTeamSchema, JoinTournamentSchema, JoinByCodeSchema, UpdateTeamSettingsSchema } from "./types";
export type { CreateTeamInput, JoinTournamentInput, JoinByCodeInput, UpdateTeamSettingsInput } from "./types";
