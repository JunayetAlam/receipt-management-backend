import httpStatus from 'http-status';
import config from '../../../config';
import AppError from '../../errors/AppError';
import { AuthUser } from '../../interface';
import { generateOTP, otpExpiryTime } from '../../utils/otp';
import { insecurePrisma, prisma } from '../../utils/prisma';
import { sendOtp } from '../../utils/sendOtp';
import { createSession, hashSid } from '../../utils/sessions';
import { Request, Response } from 'express';
import { setSessionCookie } from '../../utils/cookieOptions';
import sendResponse from '../../utils/sendResponse';
import { User, UserRoleEnum } from '../../../generated/prisma/client';

type AuthUserSource = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRoleEnum;
  profilePhoto?: string | null;
};

export const toAuthUser = (user: AuthUserSource): AuthUser => ({
  id: user.id,
  name: `${user.firstName} ${user.lastName}`,
  email: user.email,
  role: user.role,
  ...(user.profilePhoto && { profilePhoto: user.profilePhoto }),
});

export const resendOtpUtil = async (email: string) => {
  const user = await insecurePrisma.user.findFirstOrThrow({
    where: {
      email: email,
    },
  });

  if (user.isDeleted) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Account has been deleted. Please contact support to reactivate your account',
    );
  }

  if (user.status === 'BLOCKED') {
    throw new AppError(httpStatus.FORBIDDEN, 'You are Blocked!');
  }
  if (user.status === 'INACTIVE') {
    throw new AppError(httpStatus.FORBIDDEN, 'Your account is inactive.');
  }
  if (user.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Already verified');
  }

  const otp = generateOTP();

  if (config.env === 'development') {
    console.log(`[DEV OTP] ${email} => ${otp}`);
  }

  await prisma.user.update({
    where: { email: email },
    data: {
      otp: hashSid(otp),
      otpExpiry: otpExpiryTime(),
      otpFor: 'USER_VERIFICATION',
      otpAttempts: 0,
    },
  });

  await sendOtp({ email, otp });

  return {
    message: 'Verification otp sent successfully. Please check your email.',
  };
};

export const createSessionUtil = async (
  userData: User,
  req: Request,
  res: Response,
) => {
  const { sid, session } = await createSession({
    userId: userData.id,
    req,
  });
  setSessionCookie(res, sid, session.createdAt);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User logged in successfully',
    data: toAuthUser(userData),
  });
};
