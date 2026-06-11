export const keys = {
  teamRrs:     (teamId: string)   => `rrs:team:${teamId}`,
  playerRrs:   (playerId: string) => `rrs:player:${playerId}`,
  playerStats: (playerId: string) => `stats:player:${playerId}`,
} as const;
