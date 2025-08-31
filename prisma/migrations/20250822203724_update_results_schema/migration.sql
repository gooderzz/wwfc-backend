/*
  Warnings:

  - The values [ASSIST,YELLOW_CARD,RED_CARD,SIN_BIN,SAVE,OWN_GOAL,PENALTY_GOAL] on the enum `MatchEventType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isOwnGoal` on the `MatchEvent` table. All the data in the column will be lost.
  - You are about to drop the column `isPenalty` on the `MatchEvent` table. All the data in the column will be lost.
  - You are about to drop the column `penaltySaves` on the `MatchEvent` table. All the data in the column will be lost.
  - You are about to drop the column `saves` on the `MatchEvent` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MatchEventType_new" AS ENUM ('GOAL', 'CARD', 'SUBSTITUTION', 'PENALTY_SAVE');
ALTER TABLE "MatchEvent" ALTER COLUMN "eventType" TYPE "MatchEventType_new" USING ("eventType"::text::"MatchEventType_new");
ALTER TYPE "MatchEventType" RENAME TO "MatchEventType_old";
ALTER TYPE "MatchEventType_new" RENAME TO "MatchEventType";
DROP TYPE "MatchEventType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Fixture" ADD COLUMN     "totalSaves" INTEGER;

-- AlterTable
ALTER TABLE "MatchEvent" DROP COLUMN "isOwnGoal",
DROP COLUMN "isPenalty",
DROP COLUMN "penaltySaves",
DROP COLUMN "saves",
ADD COLUMN     "goalType" TEXT;
