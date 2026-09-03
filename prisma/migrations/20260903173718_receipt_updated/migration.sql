-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "deleteReason" TEXT,
ADD COLUMN     "deleteRequestedAt" TIMESTAMP(3),
ADD COLUMN     "deleteRequestedById" TEXT,
ADD COLUMN     "isDeleteRequested" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "receipts_isDeleted_idx" ON "receipts"("isDeleted");

-- CreateIndex
CREATE INDEX "receipts_isDeleteRequested_idx" ON "receipts"("isDeleteRequested");

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_deleteRequestedById_fkey" FOREIGN KEY ("deleteRequestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
