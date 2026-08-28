import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../../generated/prisma/client';
import config from '../../config';

const pool = new Pool({
  connectionString: config.database_url,
  connectionTimeoutMillis: 5000,
});

const createPrismaClient = (omitUserSecrets: boolean) =>
  new PrismaClient({
    adapter: new PrismaPg(pool),
    log: config.env === 'development' ? ['error', 'warn'] : ['error'],
    ...(omitUserSecrets
      ? {
          omit: {
            user: {
              password: true,
              otp: true,
              otpExpiry: true,
              otpAttempts: true,
              otpFor: true,
              passwordResetToken: true,
              passwordResetTokenExpires: true,
              emailVerificationToken: true,
              emailVerificationTokenExpires: true,
              isAgreeWithTerms: true,
            },
          },
        }
      : {}),
  });

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
  insecurePrisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient(true);

export const insecurePrisma =
  globalForPrisma.insecurePrisma ?? createPrismaClient(false);

if (config.env !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.insecurePrisma = insecurePrisma;
}
