-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('CUSTOMER', 'RETAILER');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "customerType" "CustomerType" NOT NULL DEFAULT 'CUSTOMER';

-- CreateIndex
CREATE INDEX "customers_customerType_idx" ON "customers"("customerType");
