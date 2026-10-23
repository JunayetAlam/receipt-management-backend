-- AlterTable
ALTER TABLE "products" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedById" TEXT;

-- AlterTable
ALTER TABLE "receipts" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedById" TEXT;

-- AlterTable
ALTER TABLE "return_invoices" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedById" TEXT;

-- CreateIndex
CREATE INDEX "products_isArchived_idx" ON "products"("isArchived");
CREATE INDEX "receipts_isArchived_idx" ON "receipts"("isArchived");
CREATE INDEX "return_invoices_isArchived_idx" ON "return_invoices"("isArchived");

-- Data migration: records that were previously "soft deleted" (and could be
-- restored) are now archived. isDeleted is reserved for full (permanent) delete.
UPDATE "products" SET "isArchived" = true, "archivedAt" = "updatedAt", "isDeleted" = false WHERE "isDeleted" = true;
UPDATE "receipts" SET "isArchived" = true, "archivedAt" = "updatedAt", "isDeleted" = false WHERE "isDeleted" = true;
UPDATE "return_invoices" SET "isArchived" = true, "archivedAt" = "updatedAt", "isDeleted" = false WHERE "isDeleted" = true;
