-- CreateEnum
CREATE TYPE "Location" AS ENUM ('HOME', 'AWAY');

-- AlterTable
ALTER TABLE "Fixture" ADD COLUMN     "location" "Location" NOT NULL DEFAULT 'HOME',
ADD COLUMN     "venue" TEXT;
