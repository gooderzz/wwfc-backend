/*
  Warnings:

  - A unique constraint covering the columns `[teamIdentityId,seasonId]` on the table `ScrapedTeam` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ScrapedTeam_teamName_division_leagueId_seasonId_key";

-- CreateIndex
CREATE UNIQUE INDEX "ScrapedTeam_teamIdentityId_seasonId_key" ON "ScrapedTeam"("teamIdentityId", "seasonId");
