-- CreateEnum
CREATE TYPE "DivisionChangeType" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateTable
CREATE TABLE "DivisionChangeLog" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "oldDivision" TEXT NOT NULL,
    "newDivision" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "changeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changeType" "DivisionChangeType" NOT NULL DEFAULT 'AUTOMATIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DivisionChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DivisionChangeLog_teamId_idx" ON "DivisionChangeLog"("teamId");

-- CreateIndex
CREATE INDEX "DivisionChangeLog_seasonId_idx" ON "DivisionChangeLog"("seasonId");

-- CreateIndex
CREATE INDEX "DivisionChangeLog_changeDate_idx" ON "DivisionChangeLog"("changeDate");

-- AddForeignKey
ALTER TABLE "DivisionChangeLog" ADD CONSTRAINT "DivisionChangeLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
