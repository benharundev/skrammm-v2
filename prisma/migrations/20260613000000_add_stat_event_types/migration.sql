-- Add performance stat event types to MatchEventType enum
-- Each stat increment during a match is stored as a zero-point event

ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'tackles_dom';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'tackles_passive';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'tackles_miss';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'line_breaks';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'ball_carries';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'offloads';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'handling_errors';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'rucks_secured';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'turnovers_won';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'scrums_won';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'scrums_lost';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'lineouts_won';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'lineouts_lost';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'penalties_conceded';
