-- CreateTable
CREATE TABLE "DivisionHierarchy" (
    "id" SERIAL NOT NULL,
    "seasonId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "hierarchy" TEXT NOT NULL,
    "divisionNames" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DivisionHierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DivisionHierarchy_seasonId_idx" ON "DivisionHierarchy"("seasonId");

-- CreateIndex
CREATE INDEX "DivisionHierarchy_leagueId_idx" ON "DivisionHierarchy"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "DivisionHierarchy_seasonId_leagueId_key" ON "DivisionHierarchy"("seasonId", "leagueId");
