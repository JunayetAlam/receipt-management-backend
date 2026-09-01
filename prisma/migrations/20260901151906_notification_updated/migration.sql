/*
  Warnings:

  - You are about to drop the column `isRead` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `readAt` on the `notifications` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "NotificationTargetType" AS ENUM ('ALL', 'ADMINS', 'CASHIERS', 'SPECIFIC_USER');

-- DropIndex
DROP INDEX "notifications_isRead_idx";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "isRead",
DROP COLUMN "readAt",
ADD COLUMN     "targetType" "NotificationTargetType" NOT NULL DEFAULT 'SPECIFIC_USER',
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "notification_reads" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_reads_userId_idx" ON "notification_reads"("userId");

-- CreateIndex
CREATE INDEX "notification_reads_notificationId_idx" ON "notification_reads"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_reads_notificationId_userId_key" ON "notification_reads"("notificationId", "userId");

-- CreateIndex
CREATE INDEX "notifications_targetType_idx" ON "notifications"("targetType");

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
