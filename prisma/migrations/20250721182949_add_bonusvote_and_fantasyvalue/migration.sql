-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fantasyValue" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "BonusVote" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "fixtureId" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BonusVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BonusVote_userId_fixtureId_key" ON "BonusVote"("userId", "fixtureId");

-- AddForeignKey
ALTER TABLE "BonusVote" ADD CONSTRAINT "BonusVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusVote" ADD CONSTRAINT "BonusVote_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
