/*
  Warnings:

  - You are about to drop the column `price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `receipt_items` table. All the data in the column will be lost.
  - Added the required column `sellingPrice` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellingPrice` to the `receipt_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "products" DROP COLUMN "price",
ADD COLUMN     "buyingPrice" DOUBLE PRECISION,
ADD COLUMN     "sellingPrice" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "receipt_items" DROP COLUMN "unitPrice",
ADD COLUMN     "buyingPrice" DOUBLE PRECISION,
ADD COLUMN     "sellingPrice" DOUBLE PRECISION NOT NULL;
