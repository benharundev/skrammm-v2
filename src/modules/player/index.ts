import { cache } from "react";
import {
  createPlayer,
  claimPlayer,
  getPlayerById,
  getPlayersByTeam,
  getClaimedPlayerForUser as _getClaimedPlayerForUser,
  getPlayerStats,
  getPlayerStatsByTournament,
  getPlayerMatchesInTournament,
  getPlayerTournamentHistory,
  getPlayerReliabilityHistory,
  getLatestReliabilityComponents,
  updatePlayerProfile,
  updatePlayerByManager,
  removePlayerFromSquad,
  generatePlayerQrToken,
  upsertMedicalProfile,
  getPlayerName,
  updatePlayerPhoto,
} from "./service";

export {
  createPlayer,
  claimPlayer,
  getPlayerById,
  getPlayersByTeam,
  getPlayerStats,
  getPlayerStatsByTournament,
  getPlayerMatchesInTournament,
  getPlayerTournamentHistory,
  getPlayerReliabilityHistory,
  getLatestReliabilityComponents,
  updatePlayerProfile,
  updatePlayerByManager,
  removePlayerFromSquad,
  generatePlayerQrToken,
  upsertMedicalProfile,
  getPlayerName,
  updatePlayerPhoto,
};
export const getClaimedPlayerForUser = cache(_getClaimedPlayerForUser);

export {
  CreatePlayerSchema,
  ClaimPlayerSchema,
  UpdateProfileSchema,
  UpdateMedicalProfileSchema,
} from "./types";

export type {
  CreatePlayerInput,
  ClaimPlayerInput,
  PlayerStats,
  TournamentHistoryItem,
  ReliabilityDataPoint,
  UpdateProfileInput,
  UpdateMedicalProfileInput,
} from "./types";
