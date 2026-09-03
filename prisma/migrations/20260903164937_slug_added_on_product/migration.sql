-- AlterTable
ALTER TABLE "products" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "products"("slug");
