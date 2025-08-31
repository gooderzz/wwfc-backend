-- CreateTable
CREATE TABLE "TeamSelection" (
    "id" TEXT NOT NULL,
    "fixtureId" INTEGER NOT NULL,
    "starting11" JSONB NOT NULL,
    "substitutes" JSONB NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActualTeamSelection" (
    "id" TEXT NOT NULL,
    "fixtureId" INTEGER NOT NULL,
    "starting11" JSONB NOT NULL,
    "substitutes" JSONB NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActualTeamSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamSelection_fixtureId_key" ON "TeamSelection"("fixtureId");

-- CreateIndex
CREATE UNIQUE INDEX "ActualTeamSelection_fixtureId_key" ON "ActualTeamSelection"("fixtureId");

-- AddForeignKey
ALTER TABLE "TeamSelection" ADD CONSTRAINT "TeamSelection_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualTeamSelection" ADD CONSTRAINT "ActualTeamSelection_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
