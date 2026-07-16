-- Backfill match_events rows still using the pre-rename draft MatchEventType
-- values (added by 20260613000000_add_stat_event_types, renamed in schema.prisma
-- by commit 7ac2b3b) to their current rugby-standard equivalents.
--
-- Postgres enum labels are append-only — the old draft labels are still valid
-- in the DB, but the Prisma-generated client only recognizes the values
-- currently in schema.prisma. Rows still holding a draft value fail to
-- deserialize with PrismaClientUnknownRequestError, crashing any page that
-- reads that match's events.

-- Dominant/passive tackle split was collapsed into a single "made" concept.
UPDATE "match_events" SET "eventType" = 'tackles_made' WHERE "eventType" = 'tackles_dom';
UPDATE "match_events" SET "eventType" = 'tackles_made' WHERE "eventType" = 'tackles_passive';
UPDATE "match_events" SET "eventType" = 'tackles_missed' WHERE "eventType" = 'tackles_miss';

UPDATE "match_events" SET "eventType" = 'clean_breaks' WHERE "eventType" = 'line_breaks';
UPDATE "match_events" SET "eventType" = 'runs' WHERE "eventType" = 'ball_carries';
UPDATE "match_events" SET "eventType" = 'knock_on' WHERE "eventType" = 'handling_errors';
UPDATE "match_events" SET "eventType" = 'rucks_won' WHERE "eventType" = 'rucks_secured';

UPDATE "match_events" SET "eventType" = 'scrums_own_feed_won' WHERE "eventType" = 'scrums_won';
UPDATE "match_events" SET "eventType" = 'scrums_own_feed_lost' WHERE "eventType" = 'scrums_lost';
UPDATE "match_events" SET "eventType" = 'lineouts_own_throw_won' WHERE "eventType" = 'lineouts_won';
UPDATE "match_events" SET "eventType" = 'lineouts_own_throw_lost' WHERE "eventType" = 'lineouts_lost';

-- turnovers_won has no current equivalent (new enum only kept the conceded
-- side) — no replacement stat category exists, so these events are removed.
DELETE FROM "match_events" WHERE "eventType" = 'turnovers_won';
