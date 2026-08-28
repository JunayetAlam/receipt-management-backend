-- Recreate UserRoleEnum: USER -> CASHIER, add ADMIN
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

CREATE TYPE "UserRoleEnum_new" AS ENUM ('SUPERADMIN', 'ADMIN', 'CASHIER');

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "UserRoleEnum_new"
  USING (
    CASE
      WHEN "role"::text = 'USER' THEN 'CASHIER'
      ELSE "role"::text
    END::"UserRoleEnum_new"
  );

DROP TYPE "UserRoleEnum";

ALTER TYPE "UserRoleEnum_new" RENAME TO "UserRoleEnum";

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CASHIER';

-- Recreate UserStatus: add PENDING
ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT;

CREATE TYPE "UserStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'BLOCKED');

ALTER TABLE "users"
  ALTER COLUMN "status" TYPE "UserStatus_new"
  USING ("status"::text::"UserStatus_new");

DROP TYPE "UserStatus";

ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";

ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- createdBy / updatedBy
ALTER TABLE "users" ADD COLUMN "createdById" TEXT;
ALTER TABLE "users" ADD COLUMN "updatedById" TEXT;

CREATE INDEX "users_createdById_idx" ON "users"("createdById");
CREATE INDEX "users_updatedById_idx" ON "users"("updatedById");

ALTER TABLE "users" ADD CONSTRAINT "users_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
