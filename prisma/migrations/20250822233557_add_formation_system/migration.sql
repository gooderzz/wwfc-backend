-- CreateEnum
CREATE TYPE "PositionCategory" AS ENUM ('DEFENDER', 'MIDFIELDER', 'FORWARD');

-- AlterTable
ALTER TABLE "Fixture" ADD COLUMN     "actualFormationId" TEXT,
ADD COLUMN     "plannedFormationId" TEXT;

-- AlterTable
ALTER TABLE "TeamSelection" ADD COLUMN     "formationId" TEXT NOT NULL DEFAULT '4-3-3',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormationPosition" (
    "id" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PositionCategory" NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isDefensive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormationPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormationStats" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "formationId" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "goalsScored" INTEGER NOT NULL DEFAULT 0,
    "goalsConceded" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormationStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormationPosition_formationId_idx" ON "FormationPosition"("formationId");

-- CreateIndex
CREATE INDEX "FormationStats_teamId_idx" ON "FormationStats"("teamId");

-- CreateIndex
CREATE INDEX "FormationStats_formationId_idx" ON "FormationStats"("formationId");

-- CreateIndex
CREATE UNIQUE INDEX "FormationStats_teamId_formationId_key" ON "FormationStats"("teamId", "formationId");

-- CreateIndex
CREATE INDEX "TeamSelection_formationId_idx" ON "TeamSelection"("formationId");

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_plannedFormationId_fkey" FOREIGN KEY ("plannedFormationId") REFERENCES "Formation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_actualFormationId_fkey" FOREIGN KEY ("actualFormationId") REFERENCES "Formation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSelection" ADD CONSTRAINT "TeamSelection_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormationPosition" ADD CONSTRAINT "FormationPosition_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormationStats" ADD CONSTRAINT "FormationStats_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormationStats" ADD CONSTRAINT "FormationStats_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
