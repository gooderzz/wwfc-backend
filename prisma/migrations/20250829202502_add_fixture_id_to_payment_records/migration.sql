-- AlterTable
ALTER TABLE "PaymentRecord" ADD COLUMN     "fixtureId" INTEGER;

-- CreateIndex
CREATE INDEX "PaymentRecord_fixtureId_idx" ON "PaymentRecord"("fixtureId");

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE SET NULL ON UPDATE CASCADE;
