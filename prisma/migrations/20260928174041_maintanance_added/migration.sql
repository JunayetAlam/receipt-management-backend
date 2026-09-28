-- CreateTable
CREATE TABLE "system_maintenances" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL DEFAULT 'System Under Maintenance',
    "message" TEXT NOT NULL DEFAULT 'We are currently performing scheduled maintenance to improve our service. We apologize for any inconvenience.',
    "reason" TEXT,
    "estimatedEndTime" TIMESTAMP(3),
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "supportNotice" TEXT,
    "lastToggledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_maintenances_pkey" PRIMARY KEY ("id")
);
