-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('manager', 'coach', 'physio');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('unclaimed', 'claimed');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('roster_pending', 'active', 'removed');

-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('festival', 'tiered', 'elimination');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('draft', 'paid', 'live', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "TeamEntryStatus" AS ENUM ('pending_approval', 'approved', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('scheduled', 'live', 'suspended', 'locked', 'completed');

-- CreateEnum
CREATE TYPE "OfficialRole" AS ENUM ('referee', 'assistant');

-- CreateEnum
CREATE TYPE "MatchEventType" AS ENUM ('try', 'conversion', 'penalty', 'drop_goal', 'yellow_card', 'red_card', 'sub_in', 'sub_out');

-- CreateEnum
CREATE TYPE "FitnessStatus" AS ENUM ('fit', 'doubtful', 'out');

-- CreateEnum
CREATE TYPE "InjurySeverity" AS ENUM ('minor', 'moderate', 'serious');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "origin" TEXT,
    "trainingGround" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_staff" (
    "id" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "StaffRole" NOT NULL DEFAULT 'manager',
    "isPrimaryManager" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "teamId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "dob" DATE,
    "jerseyNumber" INTEGER,
    "position" TEXT,
    "photoUrl" TEXT,
    "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'unclaimed',
    "playerIdCode" TEXT NOT NULL,
    "claimContact" TEXT,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "guardianName" TEXT,
    "guardianContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_qr_tokens" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rotatedFromId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_qr_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'roster_pending',
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "organizerUserId" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "dailyStartTime" TEXT,
    "dailyEndTime" TEXT,
    "format" "TournamentFormat" NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'draft',
    "branding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_teams" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "seed" INTEGER,
    "groupLabel" TEXT,
    "status" "TeamEntryStatus" NOT NULL DEFAULT 'pending_approval',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_invitations" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "teamId" UUID,
    "emailSentTo" TEXT NOT NULL,
    "claimToken" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "round" TEXT,
    "groupLabel" TEXT,
    "homeTeamId" UUID NOT NULL,
    "awayTeamId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "pitch" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'scheduled',
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "videoUrl" TEXT,
    "refereeName" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_officials" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "role" "OfficialRole" NOT NULL DEFAULT 'referee',
    "name" TEXT NOT NULL,

    CONSTRAINT "match_officials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_events" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "playerId" UUID,
    "eventType" "MatchEventType" NOT NULL,
    "minute" INTEGER,
    "payload" JSONB,
    "recordedByUserId" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_lineups" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "isStarter" BOOLEAN NOT NULL DEFAULT true,
    "jerseyNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_lineups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_scans" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "scannedByUserId" UUID NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledArrivalAt" TIMESTAMP(3),
    "minutesLate" INTEGER,
    "qrTokenId" UUID,
    "ip" TEXT,
    "userAgent" TEXT,
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_attendance" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "checkedInByUserId" UUID NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_medical_profiles" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "fitnessStatus" "FitnessStatus" NOT NULL DEFAULT 'fit',
    "injuryType" TEXT,
    "bodyPart" TEXT,
    "expectedReturnAt" DATE,
    "allergies" TEXT,
    "bloodType" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "note" TEXT,
    "ownerIsClaimed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_medical_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_injury_reports" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "injuryType" TEXT NOT NULL,
    "bodyPart" TEXT,
    "severity" "InjurySeverity" NOT NULL DEFAULT 'minor',
    "actionTaken" TEXT,
    "note" TEXT,
    "recordedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_injury_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reliability_snapshots" (
    "id" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "components" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reliability_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "clickUrl" TEXT,
    "tier" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "organizerUserId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MYR',
    "processor" TEXT NOT NULL,
    "processorRef" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "raw" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "team_staff_teamId_userId_key" ON "team_staff"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "players_playerIdCode_key" ON "players"("playerIdCode");

-- CreateIndex
CREATE INDEX "players_teamId_idx" ON "players"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "player_qr_tokens_token_key" ON "player_qr_tokens"("token");

-- CreateIndex
CREATE INDEX "player_qr_tokens_playerId_expiresAt_idx" ON "player_qr_tokens"("playerId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_playerId_key" ON "team_members"("teamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_code_key" ON "tournaments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_slug_key" ON "tournaments"("slug");

-- CreateIndex
CREATE INDEX "tournaments_status_idx" ON "tournaments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_teams_tournamentId_teamId_key" ON "tournament_teams"("tournamentId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_invitations_claimToken_key" ON "tournament_invitations"("claimToken");

-- CreateIndex
CREATE INDEX "matches_tournamentId_scheduledAt_idx" ON "matches"("tournamentId", "scheduledAt");

-- CreateIndex
CREATE INDEX "match_events_matchId_createdAt_idx" ON "match_events"("matchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "match_lineups_matchId_teamId_playerId_key" ON "match_lineups"("matchId", "teamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_scans_qrTokenId_key" ON "attendance_scans"("qrTokenId");

-- CreateIndex
CREATE INDEX "attendance_scans_matchId_idx" ON "attendance_scans"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_scans_matchId_playerId_key" ON "attendance_scans"("matchId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "team_attendance_matchId_teamId_key" ON "team_attendance"("matchId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "player_medical_profiles_playerId_key" ON "player_medical_profiles"("playerId");

-- CreateIndex
CREATE INDEX "reliability_snapshots_playerId_computedAt_idx" ON "reliability_snapshots"("playerId", "computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_processor_processorRef_key" ON "payments"("processor", "processorRef");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_staff" ADD CONSTRAINT "team_staff_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_staff" ADD CONSTRAINT "team_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_qr_tokens" ADD CONSTRAINT "player_qr_tokens_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_qr_tokens" ADD CONSTRAINT "player_qr_tokens_rotatedFromId_fkey" FOREIGN KEY ("rotatedFromId") REFERENCES "player_qr_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_organizerUserId_fkey" FOREIGN KEY ("organizerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_invitations" ADD CONSTRAINT "tournament_invitations_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_invitations" ADD CONSTRAINT "tournament_invitations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_officials" ADD CONSTRAINT "match_officials_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_scans" ADD CONSTRAINT "attendance_scans_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_scans" ADD CONSTRAINT "attendance_scans_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_scans" ADD CONSTRAINT "attendance_scans_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_scans" ADD CONSTRAINT "attendance_scans_scannedByUserId_fkey" FOREIGN KEY ("scannedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_scans" ADD CONSTRAINT "attendance_scans_qrTokenId_fkey" FOREIGN KEY ("qrTokenId") REFERENCES "player_qr_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_attendance" ADD CONSTRAINT "team_attendance_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_attendance" ADD CONSTRAINT "team_attendance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_attendance" ADD CONSTRAINT "team_attendance_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_attendance" ADD CONSTRAINT "team_attendance_checkedInByUserId_fkey" FOREIGN KEY ("checkedInByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_medical_profiles" ADD CONSTRAINT "player_medical_profiles_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_injury_reports" ADD CONSTRAINT "match_injury_reports_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_injury_reports" ADD CONSTRAINT "match_injury_reports_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_injury_reports" ADD CONSTRAINT "match_injury_reports_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reliability_snapshots" ADD CONSTRAINT "reliability_snapshots_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

