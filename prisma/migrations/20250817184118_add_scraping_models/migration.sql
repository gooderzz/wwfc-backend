/*
  Warnings:

  - A unique constraint covering the columns `[teamName,division,seasonId]` on the table `LeagueTable` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `seasonId` to the `LeagueTable` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "LeagueTable_teamName_division_key";

-- AlterTable
ALTER TABLE "LeagueTable" ADD COLUMN     "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "scrapedTeamId" INTEGER,
ADD COLUMN     "seasonId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "scrapedTeamId" INTEGER;

-- CreateTable
CREATE TABLE "ScrapedTeam" (
    "id" SERIAL NOT NULL,
    "teamName" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapedTeam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScrapedTeam_teamName_division_leagueId_key" ON "ScrapedTeam"("teamName", "division", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueTable_teamName_division_seasonId_key" ON "LeagueTable"("teamName", "division", "seasonId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_scrapedTeamId_fkey" FOREIGN KEY ("scrapedTeamId") REFERENCES "ScrapedTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueTable" ADD CONSTRAINT "LeagueTable_scrapedTeamId_fkey" FOREIGN KEY ("scrapedTeamId") REFERENCES "ScrapedTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
