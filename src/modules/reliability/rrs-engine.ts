import { TOURNAMENT_WEIGHTS, MATCH_WEIGHTS } from "./types";
import type { MatchRawData, RrsCareerLevel } from "./types";

export function computeMatchScore(data: MatchRawData): number {
  if (!data.isPlaying) return 0.0;

  const W = TOURNAMENT_WEIGHTS[data.tournamentFormat];
  const outcomeBonus =
    data.outcome === "Win"
      ? MATCH_WEIGHTS.O_win
      : data.outcome === "Tie"
        ? MATCH_WEIGHTS.O_tie
        : MATCH_WEIGHTS.O_loss;

  const raw =
    MATCH_WEIGHTS.P +
    MATCH_WEIGHTS.w_try * data.tries +
    MATCH_WEIGHTS.w_conv * data.conversions +
    MATCH_WEIGHTS.w_dg * data.dropGoals +
    outcomeBonus -
    MATCH_WEIGHTS.v_yc * data.yellowCards -
    MATCH_WEIGHTS.v_rc * data.redCards;

  return Math.max(0, raw * W);
}

// allMatchScores must already include 0.0 entries for matches the player missed.
// Its length IS the denominator N.
export function computeTournamentRating(allMatchScores: number[]): number {
  if (allMatchScores.length === 0) return 0;
  const sum = allMatchScores.reduce((acc, s) => acc + s, 0);
  return sum / allMatchScores.length;
}

// allMatchScores must include 0.0 for non-appearances (career-wide denominator).
export function computeCareerRrs(allMatchScores: number[]): RrsCareerLevel {
  const n = allMatchScores.length;
  if (n === 0) {
    return { rrsCareer: 0, metricsMean: 0, varianceSigma: 0, totalCareerMatches: 0 };
  }

  const mean = allMatchScores.reduce((acc, s) => acc + s, 0) / n;
  const variance = allMatchScores.reduce((acc, s) => acc + (s - mean) ** 2, 0) / n;
  const sigma = Math.sqrt(variance);

  return {
    rrsCareer: mean - MATCH_WEIGHTS.gamma * sigma,
    metricsMean: mean,
    varianceSigma: sigma,
    totalCareerMatches: n,
  };
}

// Returns rrs30Days, window count, and low_recent_sample flag.
// trendDelta and status are computed by the caller after career RRS is known.
export function computeLast30DaysRrs(
  allMatchData: Array<{ score: number; date: Date }>,
  executionDate: Date
): { rrs30Days: number; matchesPlayedWindow: number; lowRecentSample: boolean } {
  const cutoff = new Date(executionDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recent = allMatchData.filter((m) => m.date >= cutoff);
  const count = recent.length;

  if (count === 0) {
    return { rrs30Days: 0, matchesPlayedWindow: 0, lowRecentSample: true };
  }

  const mean = recent.reduce((acc, m) => acc + m.score, 0) / count;
  const lowRecentSample = count < 2;

  if (lowRecentSample) {
    return { rrs30Days: mean, matchesPlayedWindow: count, lowRecentSample: true };
  }

  const variance = recent.reduce((acc, m) => acc + (m.score - mean) ** 2, 0) / count;
  const sigma = Math.sqrt(variance);
  return {
    rrs30Days: mean - MATCH_WEIGHTS.gamma * sigma,
    matchesPlayedWindow: count,
    lowRecentSample: false,
  };
}
