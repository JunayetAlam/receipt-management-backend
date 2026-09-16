-- CreateTable
CREATE TABLE "return_invoices" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "subTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueRefundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isDeleteRequested" BOOLEAN NOT NULL DEFAULT false,
    "deleteRequestedById" TEXT,
    "deleteRequestedAt" TIMESTAMP(3),
    "deleteReason" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_invoice_items" (
    "id" TEXT NOT NULL,
    "returnInvoiceId" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "receiptItemId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "unit" "ProductUnit" NOT NULL DEFAULT 'PIECE',
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "return_invoices_returnNumber_key" ON "return_invoices"("returnNumber");

-- CreateIndex
CREATE INDEX "return_invoices_returnNumber_idx" ON "return_invoices"("returnNumber");

-- CreateIndex
CREATE INDEX "return_invoices_receiptId_idx" ON "return_invoices"("receiptId");

-- CreateIndex
CREATE INDEX "return_invoices_status_idx" ON "return_invoices"("status");

-- CreateIndex
CREATE INDEX "return_invoices_isDeleted_idx" ON "return_invoices"("isDeleted");

-- CreateIndex
CREATE INDEX "return_invoices_isDeleteRequested_idx" ON "return_invoices"("isDeleteRequested");

-- CreateIndex
CREATE INDEX "return_invoices_createdById_idx" ON "return_invoices"("createdById");

-- CreateIndex
CREATE INDEX "return_invoices_updatedById_idx" ON "return_invoices"("updatedById");

-- CreateIndex
CREATE INDEX "return_invoices_createdAt_idx" ON "return_invoices"("createdAt");

-- CreateIndex
CREATE INDEX "return_invoice_items_returnInvoiceId_idx" ON "return_invoice_items"("returnInvoiceId");

-- CreateIndex
CREATE INDEX "return_invoice_items_receiptId_idx" ON "return_invoice_items"("receiptId");

-- CreateIndex
CREATE INDEX "return_invoice_items_receiptItemId_idx" ON "return_invoice_items"("receiptItemId");

-- CreateIndex
CREATE INDEX "return_invoice_items_productId_idx" ON "return_invoice_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "return_invoice_items_returnInvoiceId_receiptItemId_key" ON "return_invoice_items"("returnInvoiceId", "receiptItemId");

-- AddForeignKey
ALTER TABLE "return_invoices" ADD CONSTRAINT "return_invoices_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_invoices" ADD CONSTRAINT "return_invoices_deleteRequestedById_fkey" FOREIGN KEY ("deleteRequestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_invoices" ADD CONSTRAINT "return_invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_invoices" ADD CONSTRAINT "return_invoices_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_invoice_items" ADD CONSTRAINT "return_invoice_items_returnInvoiceId_fkey" FOREIGN KEY ("returnInvoiceId") REFERENCES "return_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_invoice_items" ADD CONSTRAINT "return_invoice_items_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_invoice_items" ADD CONSTRAINT "return_invoice_items_receiptItemId_fkey" FOREIGN KEY ("receiptItemId") REFERENCES "receipt_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_invoice_items" ADD CONSTRAINT "return_invoice_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
