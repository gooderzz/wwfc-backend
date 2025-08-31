-- CreateEnum
CREATE TYPE "AchievementType" AS ENUM ('TOP_SCORER', 'MOST_ASSISTS', 'MOST_CLEAN_SHEETS', 'MOST_APPEARANCES', 'PLAYER_OF_THE_SEASON', 'GOAL_OF_THE_SEASON', 'ASSIST_OF_THE_SEASON', 'FIRST_GOAL', 'FIRST_ASSIST', 'FIRST_CLEAN_SHEET', 'HAT_TRICK', 'BRACE', 'PERFECT_ATTENDANCE', 'COMEBACK_PLAYER', 'ROOKIE_OF_THE_SEASON');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "jerseyNumber" INTEGER,
ADD COLUMN     "preferredFoot" TEXT,
ADD COLUMN     "profilePhoto" TEXT,
ADD COLUMN     "totalAppearances" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalAssists" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalCleanSheets" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalGoals" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weight" INTEGER;

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "AchievementType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "season" TEXT,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_userId_type_season_key" ON "Achievement"("userId", "type", "season");

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
