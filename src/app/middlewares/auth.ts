import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { UserRoleEnum } from '@prisma/client';
import config from '../../config';
import AppError from '../errors/AppError';
import { AuthUser } from '../interface';
import { clearAuthCookies } from '../utils/cookieOptions';
import { getValidSession, touchSession } from '../utils/sessions';

type TupleHasDuplicate<T extends readonly unknown[]> = T extends [
  infer F,
  ...infer R,
]
  ? F extends R[number]
    ? true
    : TupleHasDuplicate<R>
  : false;

type NoDuplicates<T extends readonly unknown[]> =
  TupleHasDuplicate<T> extends true ? never : T;

const toAuthUser = (user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRoleEnum;
  profilePhoto: string | null;
}): AuthUser => ({
  id: user.id,
  name: `${user.firstName} ${user.lastName}`,
  email: user.email,
  role: user.role,
  ...(user.profilePhoto && { profilePhoto: user.profilePhoto }),
});

const auth = <
  T extends readonly (UserRoleEnum | 'ANY' | 'OPTIONAL')[],
>(
  ...roles: NoDuplicates<T> extends never ? never : T
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const isOptional = roles.includes('OPTIONAL');

    try {
      const sid = req.cookies?.[config.session.cookie_name] as
        | string
        | undefined;
      const session = await getValidSession(sid);

      if (!session) {
        if (isOptional) {
          next();
          return;
        }
        clearAuthCookies(res);
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
      }

      const user = session.user;

      if (user.isDeleted) {
        clearAuthCookies(res);
        throw new AppError(
          httpStatus.NOT_FOUND,
          'Account has been deleted. Please contact support to reactivate your account',
        );
      }
      if (!user.isEmailVerified) {
        clearAuthCookies(res);
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are not verified!');
      }
      if (user.status === 'BLOCKED') {
        clearAuthCookies(res);
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are Blocked!');
      }

      await touchSession(session, res, sid as string);
      req.user = toAuthUser(user);

      if (roles.includes('ANY')) {
        next();
      } else {
        if (
          roles.length &&
          !roles.includes(user.role) &&
          !roles.includes('OPTIONAL')
        ) {
          throw new AppError(httpStatus.FORBIDDEN, 'Forbidden!');
        }
        next();
      }
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
