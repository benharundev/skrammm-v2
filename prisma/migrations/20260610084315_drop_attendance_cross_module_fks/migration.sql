-- DropForeignKey
ALTER TABLE "attendance_scans" DROP CONSTRAINT "attendance_scans_matchId_fkey";

-- DropForeignKey
ALTER TABLE "attendance_scans" DROP CONSTRAINT "attendance_scans_playerId_fkey";

-- DropForeignKey
ALTER TABLE "attendance_scans" DROP CONSTRAINT "attendance_scans_qrTokenId_fkey";

-- DropForeignKey
ALTER TABLE "attendance_scans" DROP CONSTRAINT "attendance_scans_teamId_fkey";

-- DropForeignKey
ALTER TABLE "team_attendance" DROP CONSTRAINT "team_attendance_matchId_fkey";

-- DropForeignKey
ALTER TABLE "team_attendance" DROP CONSTRAINT "team_attendance_teamId_fkey";

-- DropForeignKey
ALTER TABLE "team_attendance" DROP CONSTRAINT "team_attendance_tournamentId_fkey";
