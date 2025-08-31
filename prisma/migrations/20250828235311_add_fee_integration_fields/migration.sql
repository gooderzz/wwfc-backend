-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentType" ADD VALUE 'YELLOW_CARD_FEE';
ALTER TYPE "PaymentType" ADD VALUE 'RED_CARD_FEE';

-- AlterTable
ALTER TABLE "PaymentRecord" ADD COLUMN     "matchEventId" TEXT,
ADD COLUMN     "selectionType" TEXT;

-- CreateIndex
CREATE INDEX "PaymentRecord_matchEventId_idx" ON "PaymentRecord"("matchEventId");

-- CreateIndex
CREATE INDEX "PaymentRecord_selectionType_idx" ON "PaymentRecord"("selectionType");

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_matchEventId_fkey" FOREIGN KEY ("matchEventId") REFERENCES "MatchEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
