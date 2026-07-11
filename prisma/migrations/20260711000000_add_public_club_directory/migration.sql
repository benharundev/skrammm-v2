-- AlterTable: add public listing fields to teams
ALTER TABLE "teams" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "teams" ADD COLUMN "description" VARCHAR(500);
ALTER TABLE "teams" ADD COLUMN "lat" DOUBLE PRECISION;
ALTER TABLE "teams" ADD COLUMN "lng" DOUBLE PRECISION;
ALTER TABLE "teams" ADD COLUMN "address" TEXT;

-- CreateIndex: efficient directory queries
CREATE INDEX "teams_isPublic_idx" ON "teams"("isPublic");

-- CreateTable: training_slots
CREATE TABLE "training_slots" (
    "id" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "venue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: training_slots by teamId
CREATE INDEX "training_slots_teamId_idx" ON "training_slots"("teamId");

-- AddForeignKey: training_slots → teams
ALTER TABLE "training_slots" ADD CONSTRAINT "training_slots_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
