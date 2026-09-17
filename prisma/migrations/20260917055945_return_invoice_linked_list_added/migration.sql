-- AlterTable
ALTER TABLE "return_invoices" ADD COLUMN     "previousDueAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "previousReturnInvoiceId" TEXT;

-- CreateIndex
CREATE INDEX "return_invoices_previousReturnInvoiceId_idx" ON "return_invoices"("previousReturnInvoiceId");

-- AddForeignKey
ALTER TABLE "return_invoices" ADD CONSTRAINT "return_invoices_previousReturnInvoiceId_fkey" FOREIGN KEY ("previousReturnInvoiceId") REFERENCES "return_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
