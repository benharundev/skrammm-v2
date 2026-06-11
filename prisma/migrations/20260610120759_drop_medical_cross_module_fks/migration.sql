-- DropForeignKey
ALTER TABLE "match_injury_reports" DROP CONSTRAINT "match_injury_reports_matchId_fkey";

-- DropForeignKey
ALTER TABLE "match_injury_reports" DROP CONSTRAINT "match_injury_reports_playerId_fkey";

-- DropForeignKey
ALTER TABLE "player_medical_profiles" DROP CONSTRAINT "player_medical_profiles_playerId_fkey";
