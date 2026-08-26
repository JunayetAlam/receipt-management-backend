import { insecurePrisma } from './prisma';

export const cleanupExpiredSessions = async () => {
  try {
    const now = new Date();
    const { count } = await insecurePrisma.session.deleteMany({
      where: {
        expireAt: { lt: now },
      },
    });

    if (count > 0) {
      console.info(`Cleaned up ${count} expired session(s).`);
    }
  } catch (error) {
    console.error('Failed to clean up expired sessions', error);
  }
};
