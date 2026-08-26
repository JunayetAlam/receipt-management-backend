/**
 * TOKEN-BASED AUTH remnant.
 * Not used by default. Session cookies are the active auth path.
 * Restore this helper (and wire it in place of ./socketAuth) to authenticate
 * WebSocket connections via the Authorization header JWT.
 */
import { insecurePrisma } from '../utils/prisma';
import { User, UserRoleEnum } from '@prisma/client';
import { verifyToken } from '../utils/token/verifyToken';
import config from '../../config';

export type CustomWebSocket = WebSocket & {};

export async function socketAuth(
  ws: any,
  token?: string,
): Promise<User | null> {
  if (!token) {
    ws.send(
      JSON.stringify({ type: 'error', message: 'You are not authenticated' }),
    );
    return null;
  }

  let decoded: any;
  try {
    decoded = verifyToken(token, config.jwt.access_secret as string);
  } catch (error: any) {
    const errorMessage =
      error.name === 'TokenExpiredError'
        ? 'Token has expired!'
        : 'Invalid token!';
    ws.send(JSON.stringify({ type: 'error', message: errorMessage }));
    return null;
  }

  try {
    const user = await insecurePrisma.user.findUniqueOrThrow({
      where: { id: decoded.id },
      include: {
        payments: {
          where: { paymentType: 'SUBSCRIPTION', paymentStatus: 'SUCCESS' },
          select: {
            id: true,
            paymentStatus: true,
            subscriptionPackageId: true,
            endAt: true,
          },
        },
      },
    });

    if (!user || user.isDeleted) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Your account has been deleted',
        }),
      );
      return null;
    }
    if (!user.isEmailVerified) {
      ws.send(JSON.stringify({ type: 'error', message: 'Email not verified' }));
      return null;
    }
    if (user.status === 'BLOCKED') {
      ws.send(JSON.stringify({ type: 'error', message: 'You are blocked' }));
      return null;
    }

    return user;
  } catch (err: any) {
    ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
    return null;
  }
}

export function checkRoles(
  ws: any,
  user: User,
  roles: (UserRoleEnum | 'ANY')[],
): boolean {
  if (roles.includes('ANY')) return true;
  if (!roles.includes(user.role)) {
    ws.send(
      JSON.stringify({
        type: 'error',
        message: 'Forbidden: You do not have access',
      }),
    );
    return false;
  }
  return true;
}
