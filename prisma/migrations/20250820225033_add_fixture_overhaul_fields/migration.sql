/*
  Warnings:

  - You are about to drop the column `venue` on the `Fixture` table. All the data in the column will be lost.
  - Added the required column `kickOffTime` to the `Fixture` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FixtureType" AS ENUM ('LEAGUE', 'CUP', 'FRIENDLY');

-- AlterTable
ALTER TABLE "Fixture" DROP COLUMN "venue",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "cupName" TEXT,
ADD COLUMN     "fixtureType" "FixtureType" NOT NULL DEFAULT 'LEAGUE',
ADD COLUMN     "kickOffTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "seasonId" TEXT NOT NULL DEFAULT '965423047';

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "homeAddress" TEXT;
