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

/** TOKEN-BASED AUTH remnant — unused. Restore if you switch back to JWT cookies. */
export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken?: string },
) => {
  res.cookie('accessToken', tokens.accessToken, {
    ...baseCookieOptions,
    maxAge: 1000 * 60 * 60 * 24,
  });
  if (tokens.refreshToken) {
    res.cookie('refreshToken', tokens.refreshToken, {
      ...baseCookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(config.session.cookie_name, baseCookieOptions);
  res.clearCookie('accessToken', baseCookieOptions);
  res.clearCookie('refreshToken', baseCookieOptions);
};
