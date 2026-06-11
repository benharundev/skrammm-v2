export {
  createMatch,
  addMatchEvent,
  lockMatch,
  getMatchForStream,
  getMatchesByTournament,
  getMatchesPublic,
  getMatchPublicById,
  computeStandings,
  getUpcomingMatchesForTeam,
  getMatchInTournament,
  getMatchTournamentId,
  getTeamMatch,
  saveMatchLineup,
  getMatchBasic,
  getMatchEventsSince,
  getPastMatchesForTeam,
  transitionMatchPhase,
  deleteMatchEvent,
  updateMatchMetadata,
  getMatchWithRoster,
} from "./service";

export {
  AddMatchEventSchema,
  CreateMatchSchema,
  MatchEventTypeSchema,
  POINTS,
} from "./types";

export type {
  AddMatchEventInput,
  CreateMatchInput,
  PublicMatch,
  PublicMatchEvent,
  StandingRow,
  UpdateMatchMetadataInput,
  MatchPhaseStatus,
} from "./types";
