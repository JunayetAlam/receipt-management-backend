import { CookieOptions, Response } from 'express';
import config from '../../config';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
};

const sessionCookieMaxAge = (createdAt: Date) => {
  const remainingAbsolute =
    createdAt.getTime() + config.session.absolute_ms - Date.now();
  return Math.max(0, Math.min(config.session.idle_ms, remainingAbsolute));
};

export const setSessionCookie = (
  res: Response,
  sid: string,
  createdAt: Date,
) => {
  const maxAge = sessionCookieMaxAge(createdAt);
  if (maxAge <= 0) {
    clearAuthCookies(res);
    return;
  }

  res.cookie(config.session.cookie_name, sid, {
    ...baseCookieOptions,
    maxAge,
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(config.session.cookie_name, baseCookieOptions);
};
