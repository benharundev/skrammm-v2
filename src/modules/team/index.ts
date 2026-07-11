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
  listPublicTeams,
  getTeamPublicBySlug,
  createTeamWithSlots,
  upsertTrainingSlots,
  updatePublicListing,
} from "./service";

export {
  createTeam,
  getTeamById,
  joinTournament,
  getTeamsByManager,
  joinTournamentByCode,
  updateTeamSettings,
  hasTeamTournaments,
  updateTeamLogo,
  listPublicTeams,
  getTeamPublicBySlug,
  createTeamWithSlots,
  upsertTrainingSlots,
  updatePublicListing,
};
export const getManagerTeam = cache(_getManagerTeam);
export {
  CreateTeamSchema,
  JoinTournamentSchema,
  JoinByCodeSchema,
  UpdateTeamSettingsSchema,
  TrainingSlotSchema,
  CreatePublicTeamSchema,
  UpdatePublicListingSchema,
} from "./types";
export type {
  CreateTeamInput,
  JoinTournamentInput,
  JoinByCodeInput,
  UpdateTeamSettingsInput,
  TrainingSlotInput,
  CreatePublicTeamInput,
  UpdatePublicListingInput,
} from "./types";
