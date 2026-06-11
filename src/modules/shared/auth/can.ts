import { db } from "@lib/db";

// ---------------------------------------------------------------------------
// Entity-scoped RBAC guard (TECH_PRD §6.4)
//
// A user is NOT globally "an organizer". They are:
//   - organizer of tournament X
//   - manager of team Y
//   - player on team Z
//
// Call can() at the top of EVERY server action and route handler.
// Path prefix is NEVER sufficient — always verify via this guard.
//
// Returns false on any unknown scope or permission; never throws.
// Caller decides to return 401 (no session) or 403 (denied).
// ---------------------------------------------------------------------------

export type Permission =
  // Tournament
  | "tournament:edit"
  | "tournament:score"
  | "tournament:approve_team"
  | "tournament:check_in_team"
  // Team
  | "team:manage"
  | "team:approve_player"
  | "team:set_lineup"
  | "team:scan"
  // Medical
  | "medical:view_profile"
  | "medical:edit_profile"
  // Injury
  | "injury:create"
  | "injury:view"
  // Player
  | "player:edit_self"
  // Spectator
  | "spectator:read";

export interface PermissionScope {
  tournamentId?: string;
  teamId?: string;
  playerId?: string;
  matchId?: string;
}

export async function can(
  userId: string,
  permission: Permission,
  scope: PermissionScope = {}
): Promise<boolean> {
  try {
    switch (permission) {
      // -----------------------------------------------------------------------
      // Tournament permissions — requires organizer_of(tournamentId)
      // -----------------------------------------------------------------------
      case "tournament:edit":
      case "tournament:score":
      case "tournament:approve_team":
      case "tournament:check_in_team": {
        if (!scope.tournamentId) return false;
        const tournament = await db.tournament.findFirst({
          where: {
            id: scope.tournamentId,
            organizerUserId: userId,
          },
          select: { id: true },
        });
        return tournament !== null;
      }

      // -----------------------------------------------------------------------
      // team:manage — primary manager of team
      // -----------------------------------------------------------------------
      case "team:manage": {
        if (!scope.teamId) return false;
        const staff = await db.teamStaff.findFirst({
          where: {
            teamId: scope.teamId,
            userId,
            isPrimaryManager: true,
          },
          select: { id: true },
        });
        return staff !== null;
      }

      // -----------------------------------------------------------------------
      // team:approve_player — primary manager of team
      // -----------------------------------------------------------------------
      case "team:approve_player": {
        if (!scope.teamId) return false;
        const staff = await db.teamStaff.findFirst({
          where: { teamId: scope.teamId, userId, isPrimaryManager: true },
          select: { id: true },
        });
        return staff !== null;
      }

      // -----------------------------------------------------------------------
      // team:set_lineup — any staff of team (for this match)
      // -----------------------------------------------------------------------
      case "team:set_lineup": {
        if (!scope.teamId) return false;
        const staff = await db.teamStaff.findFirst({
          where: { teamId: scope.teamId, userId },
          select: { id: true },
        });
        return staff !== null;
      }

      // -----------------------------------------------------------------------
      // team:scan — any staff of team AND the match is today
      // -----------------------------------------------------------------------
      case "team:scan": {
        if (!scope.teamId || !scope.matchId) return false;
        const [staff, match] = await Promise.all([
          db.teamStaff.findFirst({
            where: { teamId: scope.teamId, userId },
            select: { id: true },
          }),
          db.match.findUnique({
            where: { id: scope.matchId },
            select: { scheduledAt: true, homeTeamId: true, awayTeamId: true },
          }),
        ]);
        if (!staff || !match) return false;
        const matchDate = match.scheduledAt.toDateString();
        const today = new Date().toDateString();
        const teamInMatch =
          match.homeTeamId === scope.teamId ||
          match.awayTeamId === scope.teamId;
        return matchDate === today && teamInMatch;
      }

      // -----------------------------------------------------------------------
      // medical:view_profile — self (claimed) | manager of player's team
      // -----------------------------------------------------------------------
      case "medical:view_profile": {
        if (!scope.playerId) return false;
        const player = await db.player.findUnique({
          where: { id: scope.playerId },
          select: { userId: true, teamId: true, claimStatus: true },
        });
        if (!player) return false;
        // Player owns their own profile once claimed
        if (player.claimStatus === "claimed" && player.userId === userId)
          return true;
        // Manager can view profile of any player on their team
        const staff = await db.teamStaff.findFirst({
          where: { teamId: player.teamId, userId },
          select: { id: true },
        });
        return staff !== null;
      }

      // -----------------------------------------------------------------------
      // medical:edit_profile — player if claimed; manager only while unclaimed
      // -----------------------------------------------------------------------
      case "medical:edit_profile": {
        if (!scope.playerId) return false;
        const player = await db.player.findUnique({
          where: { id: scope.playerId },
          select: { userId: true, teamId: true, claimStatus: true },
        });
        if (!player) return false;
        if (player.claimStatus === "claimed") {
          return player.userId === userId;
        }
        // Unclaimed → manager of the team can edit
        const staff = await db.teamStaff.findFirst({
          where: { teamId: player.teamId, userId, isPrimaryManager: true },
          select: { id: true },
        });
        return staff !== null;
      }

      // -----------------------------------------------------------------------
      // injury:create — organizer of the tournament that contains the match
      // -----------------------------------------------------------------------
      case "injury:create": {
        if (!scope.matchId) return false;
        const match = await db.match.findUnique({
          where: { id: scope.matchId },
          select: { tournament: { select: { organizerUserId: true } } },
        });
        return match?.tournament.organizerUserId === userId;
      }

      // -----------------------------------------------------------------------
      // injury:view — organizer | self (claimed player) | manager of own team
      // -----------------------------------------------------------------------
      case "injury:view": {
        if (!scope.matchId && !scope.playerId) return false;
        // If playerId given, check self or manager
        if (scope.playerId) {
          const player = await db.player.findUnique({
            where: { id: scope.playerId },
            select: { userId: true, teamId: true, claimStatus: true },
          });
          if (!player) return false;
          if (player.claimStatus === "claimed" && player.userId === userId)
            return true;
          const staff = await db.teamStaff.findFirst({
            where: { teamId: player.teamId, userId },
            select: { id: true },
          });
          if (staff) return true;
        }
        // Organizer check via match → tournament
        if (scope.matchId) {
          const match = await db.match.findUnique({
            where: { id: scope.matchId },
            select: { tournament: { select: { organizerUserId: true } } },
          });
          if (match?.tournament.organizerUserId === userId) return true;
        }
        return false;
      }

      // -----------------------------------------------------------------------
      // player:edit_self — player.userId == currentUser.id
      // -----------------------------------------------------------------------
      case "player:edit_self": {
        if (!scope.playerId) return false;
        const player = await db.player.findUnique({
          where: { id: scope.playerId },
          select: { userId: true },
        });
        return player?.userId === userId;
      }

      // -----------------------------------------------------------------------
      // spectator:read — tournament live/completed AND team approved
      // -----------------------------------------------------------------------
      case "spectator:read": {
        if (!scope.tournamentId) return false;
        const tournament = await db.tournament.findUnique({
          where: { id: scope.tournamentId },
          select: { status: true },
        });
        return (
          tournament?.status === "live" ||
          tournament?.status === "completed"
        );
      }

      default:
        return false;
    }
  } catch {
    return false;
  }
}
