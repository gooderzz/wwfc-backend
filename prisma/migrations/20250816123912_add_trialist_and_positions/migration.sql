-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'RETIRED', 'REJECTED', 'PROMOTED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TRIALIST';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "primaryPositionId" INTEGER,
ADD COLUMN     "secondaryPositionId" INTEGER,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "Position" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialistRating" (
    "id" TEXT NOT NULL,
    "trialistId" INTEGER NOT NULL,
    "managerId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "interested" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrialistRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerRating" (
    "id" TEXT NOT NULL,
    "managerId" INTEGER NOT NULL,
    "trialistId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "interested" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Position_name_key" ON "Position"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TrialistRating_trialistId_managerId_key" ON "TrialistRating"("trialistId", "managerId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerRating_managerId_trialistId_key" ON "ManagerRating"("managerId", "trialistId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_primaryPositionId_fkey" FOREIGN KEY ("primaryPositionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_secondaryPositionId_fkey" FOREIGN KEY ("secondaryPositionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialistRating" ADD CONSTRAINT "TrialistRating_trialistId_fkey" FOREIGN KEY ("trialistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialistRating" ADD CONSTRAINT "TrialistRating_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerRating" ADD CONSTRAINT "ManagerRating_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerRating" ADD CONSTRAINT "ManagerRating_trialistId_fkey" FOREIGN KEY ("trialistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
