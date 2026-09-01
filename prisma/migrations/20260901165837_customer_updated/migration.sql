-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "deleteReason" TEXT,
ADD COLUMN     "deleteRequestedAt" TIMESTAMP(3),
ADD COLUMN     "deleteRequestedById" TEXT,
ADD COLUMN     "isDeleteRequested" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "customers_isDeleted_idx" ON "customers"("isDeleted");

-- CreateIndex
CREATE INDEX "customers_isDeleteRequested_idx" ON "customers"("isDeleteRequested");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_deleteRequestedById_fkey" FOREIGN KEY ("deleteRequestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
