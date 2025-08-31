-- CreateEnum
CREATE TYPE "ScrapingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'RETRY_PENDING');

-- CreateEnum
CREATE TYPE "ScrapingType" AS ENUM ('DISCOVERY', 'LEAGUE_TABLE', 'DIVISION_SEASONS', 'FULL_UPDATE');

-- CreateTable
CREATE TABLE "ScrapingLog" (
    "id" SERIAL NOT NULL,
    "type" "ScrapingType" NOT NULL,
    "status" "ScrapingStatus" NOT NULL,
    "divisionId" TEXT,
    "seasonId" TEXT,
    "leagueId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "processingTime" INTEGER,
    "teamsFound" INTEGER NOT NULL DEFAULT 0,
    "teamsCreated" INTEGER NOT NULL DEFAULT 0,
    "teamsUpdated" INTEGER NOT NULL DEFAULT 0,
    "teamsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT[],
    "warnings" TEXT[],
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastRetryAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "initiatedById" INTEGER,
    "metadata" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScrapingLog_status_idx" ON "ScrapingLog"("status");

-- CreateIndex
CREATE INDEX "ScrapingLog_type_idx" ON "ScrapingLog"("type");

-- CreateIndex
CREATE INDEX "ScrapingLog_startedAt_idx" ON "ScrapingLog"("startedAt");

-- CreateIndex
CREATE INDEX "ScrapingLog_divisionId_seasonId_idx" ON "ScrapingLog"("divisionId", "seasonId");

-- AddForeignKey
ALTER TABLE "ScrapingLog" ADD CONSTRAINT "ScrapingLog_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
