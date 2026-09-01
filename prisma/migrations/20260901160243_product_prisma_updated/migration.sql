-- AlterTable
ALTER TABLE "products" ADD COLUMN     "deleteReason" TEXT,
ADD COLUMN     "deleteRequestedAt" TIMESTAMP(3),
ADD COLUMN     "deleteRequestedById" TEXT,
ADD COLUMN     "isDeleteRequested" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "products_isDeleted_idx" ON "products"("isDeleted");

-- CreateIndex
CREATE INDEX "products_isDeleteRequested_idx" ON "products"("isDeleteRequested");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_deleteRequestedById_fkey" FOREIGN KEY ("deleteRequestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
