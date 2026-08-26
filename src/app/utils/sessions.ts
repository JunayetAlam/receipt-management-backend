import { createHash, randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { Session, User } from '@prisma/client';
import config from '../../config';
import { insecurePrisma } from './prisma';
import { setSessionCookie } from './cookieOptions';

export type SessionWithUser = Session & { user: User };

export const hashSid = (sid: string) =>
  createHash('sha256').update(sid).digest('hex');

const idleExpireAt = (from: Date) =>
  new Date(from.getTime() + config.session.idle_ms);

const absoluteExpireAt = (createdAt: Date) =>
  new Date(createdAt.getTime() + config.session.absolute_ms);

export const nextExpireAt = (createdAt: Date, from = new Date()) => {
  const idle = idleExpireAt(from);
  const absolute = absoluteExpireAt(createdAt);
  return idle < absolute ? idle : absolute;
};

export const createSession = async ({
  userId,
  req,
}: {
  userId: string;
  req: Request;
}) => {
  const sid = randomBytes(32).toString('hex');
  const now = new Date();
  const session = await insecurePrisma.session.create({
    data: {
      userId,
      tokenHash: hashSid(sid),
      lastSeenAt: now,
      expireAt: idleExpireAt(now),
      userAgent: req.headers['user-agent'] || null,
      ip: req.ip || null,
    },
  });

  return { sid, session };
};

export const getValidSession = async (
  sid?: string,
): Promise<SessionWithUser | null> => {
  if (!sid) {
    return null;
  }

  const now = new Date();
  const session = await insecurePrisma.session.findUnique({
    where: { tokenHash: hashSid(sid) },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  const absoluteLimit = absoluteExpireAt(session.createdAt);
  if (session.expireAt <= now || absoluteLimit <= now) {
    await insecurePrisma.session
      .delete({ where: { id: session.id } })
      .catch(() => undefined);
    return null;
  }

  return session;
};

export const touchSession = async (
  session: Session,
  res: Response,
  sid: string,
) => {
  const now = new Date();
  const shouldTouch =
    now.getTime() - session.lastSeenAt.getTime() >=
    config.session.touch_after_ms;

  if (!shouldTouch) {
    return session;
  }

  const expireAt = nextExpireAt(session.createdAt, now);
  const updated = await insecurePrisma.session.update({
    where: { id: session.id },
    data: {
      lastSeenAt: now,
      expireAt,
    },
  });

  setSessionCookie(res, sid, session.createdAt);
  return updated;
};

export const destroySession = async (sid?: string) => {
  if (!sid) {
    return;
  }

  await insecurePrisma.session
    .deleteMany({ where: { tokenHash: hashSid(sid) } })
    .catch(() => undefined);
};

export const destroyAllUserSessions = async (userId: string) => {
  await insecurePrisma.session.deleteMany({ where: { userId } });
};

export const listUserSessions = async (userId: string) => {
  const now = new Date();
  return insecurePrisma.session.findMany({
    where: {
      userId,
      expireAt: { gt: now },
      createdAt: { gt: new Date(now.getTime() - config.session.absolute_ms) },
    },
    orderBy: { lastSeenAt: 'desc' },
    select: {
      id: true,
      ip: true,
      userAgent: true,
      lastSeenAt: true,
      expireAt: true,
      createdAt: true,
      tokenHash: true,
    },
  });
};

export const destroyUserSessionById = async (
  userId: string,
  sessionId: string,
) => {
  try {
    const session = await insecurePrisma.session.findFirst({
      where: { id: sessionId, userId },
      select: { id: true, tokenHash: true },
    });

    if (!session) {
      return null;
    }

    await insecurePrisma.session.delete({ where: { id: session.id } });
    return session;
  } catch {
    return null;
  }
};
