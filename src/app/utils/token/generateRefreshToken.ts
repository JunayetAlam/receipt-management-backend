/**
 * TOKEN-BASED AUTH remnant.
 * Not used by default. Session cookies are the active auth path.
 * Previously used by AuthByOtp login / refresh-token to mint a JWT access token
 * (despite the name, this never issued a refresh JWT).
 */
import { User } from '@prisma/client';
import { Secret, SignOptions } from 'jsonwebtoken';
import httpStatus from 'http-status';
import config from '../../../config';
import AppError from '../../errors/AppError';
import { insecurePrisma } from '../prisma';
import { generateToken } from './generateToken';

export const generateRefreshToken = async (email: string, user?: User) => {
  let userData: User;
  if (user) {
    userData = user;
  } else {
    userData = await insecurePrisma.user.findUniqueOrThrow({
      where: {
        email: email,
      },
    });
  }

  if (userData.isDeleted) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Account has been deleted. Please contact support to reactivate your account',
    );
  }

  if (userData.status === 'BLOCKED') {
    throw new AppError(httpStatus.FORBIDDEN, 'Account has been blocked');
  }

  if (userData.role === 'SUPERADMIN') {
    const accessToken = await generateToken(
      {
        id: userData.id,
        name: userData.firstName + userData.lastName,
        email: userData.email,
        role: userData.role,
        // isPaid: true
      },
      config.jwt.access_secret as Secret,
      config.jwt.access_expires_in as SignOptions['expiresIn'],
    );
    return {
      id: userData.id,
      role: userData.role,
      accessToken: accessToken,
      isPaid: true,
    };
  }

  const accessToken = await generateToken(
    {
      id: userData.id,
      name: userData.firstName + userData.lastName,
      email: userData.email,
      role: userData.role,
      // isPaid: payments > 0 ? true : false
    },
    config.jwt.access_secret as Secret,
    config.jwt.access_expires_in as SignOptions['expiresIn'],
  );
  return {
    id: userData.id,
    role: userData.role,
    accessToken: accessToken,
    // isPaid: payments > 0 ? true : false
  };
};
