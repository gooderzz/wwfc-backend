-- CreateEnum
CREATE TYPE "ResultType" AS ENUM ('ACTUAL_GAME', 'WALKOVER', 'POSTPONEMENT');

-- CreateEnum
CREATE TYPE "WalkoverType" AS ENUM ('HOME_WALKOVER', 'AWAY_WALKOVER');

-- CreateEnum
CREATE TYPE "MatchEventType" AS ENUM ('GOAL', 'ASSIST', 'YELLOW_CARD', 'RED_CARD', 'SIN_BIN', 'SUBSTITUTION', 'SAVE', 'PENALTY_SAVE', 'OWN_GOAL', 'PENALTY_GOAL');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('YELLOW', 'RED', 'SIN_BIN');

-- AlterTable
ALTER TABLE "Fixture" ADD COLUMN     "postponementReason" TEXT,
ADD COLUMN     "resultType" "ResultType",
ADD COLUMN     "walkoverType" "WalkoverType";

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL,
    "fixtureId" INTEGER NOT NULL,
    "eventType" "MatchEventType" NOT NULL,
    "minute" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "isOwnGoal" BOOLEAN NOT NULL DEFAULT false,
    "isPenalty" BOOLEAN NOT NULL DEFAULT false,
    "assistedById" INTEGER,
    "cardType" "CardType",
    "substitutedForId" INTEGER,
    "saves" INTEGER,
    "penaltySaves" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_assistedById_fkey" FOREIGN KEY ("assistedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_substitutedForId_fkey" FOREIGN KEY ("substitutedForId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
