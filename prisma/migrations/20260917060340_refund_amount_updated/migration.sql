/*
  Warnings:

  - You are about to drop the column `dueRefundAmount` on the `return_invoices` table. All the data in the column will be lost.
  - You are about to drop the column `previousDueAmount` on the `return_invoices` table. All the data in the column will be lost.
  - You are about to drop the column `subTotal` on the `return_invoices` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `return_invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "return_invoices" DROP COLUMN "dueRefundAmount",
DROP COLUMN "previousDueAmount",
DROP COLUMN "subTotal",
DROP COLUMN "totalAmount";
