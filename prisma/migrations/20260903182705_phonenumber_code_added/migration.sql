/*
  Warnings:

  - A unique constraint covering the columns `[countryCode,phoneNumber]` on the table `customers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "customers_phoneNumber_key";

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "countryCode" TEXT NOT NULL DEFAULT '+880';

-- CreateIndex
CREATE INDEX "customers_countryCode_idx" ON "customers"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "customers_countryCode_phoneNumber_key" ON "customers"("countryCode", "phoneNumber");
