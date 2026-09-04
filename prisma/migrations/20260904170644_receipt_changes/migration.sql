-- AlterTable
ALTER TABLE "receipt_payments" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "status" "ReceiptStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "receipt_payments_approvedById_idx" ON "receipt_payments"("approvedById");

-- AddForeignKey
ALTER TABLE "receipt_payments" ADD CONSTRAINT "receipt_payments_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
