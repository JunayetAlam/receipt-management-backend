import { Request } from 'express';
import { User, UserRoleEnum } from '@prisma/client';
import config from '../../config';
import { getValidSession } from '../utils/sessions';

export type CustomWebSocket = WebSocket & {};

const parseCookie = (cookieHeader: string | undefined, name: string) => {
  if (!cookieHeader) {
    return undefined;
  }

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return undefined;
};

export async function socketAuth(
  ws: any,
  req: Request,
): Promise<User | null> {
  const sid = parseCookie(req.headers.cookie, config.session.cookie_name);
  const session = await getValidSession(sid);

  if (!session) {
    ws.send(
      JSON.stringify({ type: 'error', message: 'You are not authenticated' }),
    );
    return null;
  }

  const user = session.user;

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
