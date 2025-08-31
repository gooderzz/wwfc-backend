/*
  Warnings:

  - You are about to drop the column `season` on the `PaymentConfig` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paymentType]` on the table `PaymentConfig` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "PaymentConfig_paymentType_season_key";

-- DropIndex
DROP INDEX "PaymentConfig_season_idx";

-- AlterTable
ALTER TABLE "PaymentConfig" DROP COLUMN "season";

-- CreateIndex
CREATE UNIQUE INDEX "PaymentConfig_paymentType_key" ON "PaymentConfig"("paymentType");
