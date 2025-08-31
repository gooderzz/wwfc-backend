/*
  Warnings:

  - A unique constraint covering the columns `[teamName,division,leagueId,seasonId]` on the table `ScrapedTeam` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[teamIdentityId]` on the table `Team` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ScrapedTeam_teamName_division_leagueId_key";

-- AlterTable
ALTER TABLE "ScrapedTeam" ADD COLUMN     "seasonId" TEXT,
ADD COLUMN     "teamIdentityId" INTEGER;

-- Update existing records with a default season ID
UPDATE "ScrapedTeam" SET "seasonId" = '965423047' WHERE "seasonId" IS NULL;

-- Make seasonId required
ALTER TABLE "ScrapedTeam" ALTER COLUMN "seasonId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "teamIdentityId" INTEGER;

-- CreateTable
CREATE TABLE "TeamIdentity" (
    "id" SERIAL NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamIdentity_canonicalName_key" ON "TeamIdentity"("canonicalName");

-- CreateIndex
CREATE UNIQUE INDEX "ScrapedTeam_teamName_division_leagueId_seasonId_key" ON "ScrapedTeam"("teamName", "division", "leagueId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_teamIdentityId_key" ON "Team"("teamIdentityId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_teamIdentityId_fkey" FOREIGN KEY ("teamIdentityId") REFERENCES "TeamIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrapedTeam" ADD CONSTRAINT "ScrapedTeam_teamIdentityId_fkey" FOREIGN KEY ("teamIdentityId") REFERENCES "TeamIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
