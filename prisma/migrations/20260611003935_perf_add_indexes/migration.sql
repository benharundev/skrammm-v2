-- DropIndex
DROP INDEX "tournaments_status_idx";

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "teams_createdAt_idx" ON "teams"("createdAt");

-- CreateIndex
CREATE INDEX "tournament_teams_status_idx" ON "tournament_teams"("status");

-- CreateIndex
CREATE INDEX "tournaments_status_createdAt_idx" ON "tournaments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "verifications_expiresAt_idx" ON "verifications"("expiresAt");
