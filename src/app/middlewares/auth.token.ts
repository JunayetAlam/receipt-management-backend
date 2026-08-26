/**
 * TOKEN-BASED AUTH remnant.
 * Not used by default. Session cookies are the active auth path.
 * Restore this middleware (and wire it in place of ./auth) to authenticate
 * via the Authorization header JWT.
 */
import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import AppError from '../errors/AppError';
import { verifyToken } from '../utils/token/verifyToken';
import { UserRoleEnum } from '../../generated/prisma/client';
import { insecurePrisma } from '../utils/prisma';

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

const auth = <T extends readonly (UserRoleEnum | 'ANY' | 'OPTIONAL')[]>(
  ...roles: NoDuplicates<T> extends never ? never : T
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;
      if (!token) {
        if (roles.includes('OPTIONAL')) {
          next();
          return;
        }
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
      }

      const verifyUserToken = verifyToken(
        token,
        config.jwt.access_secret as Secret,
      );

      const user = await insecurePrisma.user.findUniqueOrThrow({
        where: {
          id: verifyUserToken.id,
        },
      });

      if (!user) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
      }
      if (user.isDeleted) {
        throw new AppError(
          httpStatus.NOT_FOUND,
          'Account has been deleted. Please contact support to reactivate your account',
        );
      }
      if (!user.isEmailVerified) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are not verified!');
      }

      if (user.status === 'BLOCKED') {
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are Blocked!');
      }

      if (user?.profilePhoto) {
        verifyUserToken.profilePhoto = user?.profilePhoto;
      }

      req.user = {
        id: verifyUserToken.id,
        email: verifyUserToken.email,
        role: verifyUserToken.role as UserRoleEnum,
        name: verifyUserToken.name,
        ...(verifyUserToken.profilePhoto && {
          profilePhoto: verifyUserToken.profilePhoto,
        }),
      };
      if (roles.includes('ANY')) {
        next();
      } else {
        if (roles.length && !roles.includes(verifyUserToken.role)) {
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
