-- Add remaining rugby-standard stat event types to MatchEventType enum.
-- 20260613000000_add_stat_event_types added a first-draft naming scheme that
-- was renamed before use; the app now writes these rugby-standard names.
-- 'offloads' and 'penalties_conceded' were already added by that migration.
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'kicks_from_hand';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'passes';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'runs';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'metres_run';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'possession_phase';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'territory_phase';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'clean_breaks';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'defenders_beaten';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'rucks_won';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'rucks_lost';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'mauls_won';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'mauls_lost';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'turnovers_conceded';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'tackles_made';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'tackles_missed';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'scrums_own_feed_won';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'scrums_own_feed_lost';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'lineouts_own_throw_won';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'lineouts_own_throw_lost';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'forward_pass';
ALTER TYPE "MatchEventType" ADD VALUE IF NOT EXISTS 'knock_on';

-- AlterTable: match clock/pause tracking and video analyst mode fields
ALTER TABLE "matches" ADD COLUMN "pausedAt" TIMESTAMP(3),
ADD COLUMN "secondHalfStartedAt" TIMESTAMP(3),
ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "totalPausedMs" INTEGER NOT NULL DEFAULT 0;
