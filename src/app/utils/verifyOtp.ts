import { timingSafeEqual } from 'crypto';
import httpStatus from 'http-status';
import { OTPFor } from '../../generated/prisma/client';
import AppError from '../errors/AppError';
import { insecurePrisma } from './prisma';
import { hashSid } from './sessions';

const MAX_OTP_ATTEMPTS = 5;

const hashesMatch = (stored: string, incoming: string) => {
  const storedBuf = Buffer.from(stored);
  const incomingBuf = Buffer.from(incoming);
  if (storedBuf.length !== incomingBuf.length) {
    return false;
  }
  return timingSafeEqual(storedBuf, incomingBuf);
};

const clearOtp = async (email: string) => {
  await insecurePrisma.user.update({
    where: { email },
    data: {
      otp: null,
      otpExpiry: null,
      otpFor: 'NOT',
      otpAttempts: 0,
    },
  });
};

export const verifyOtp = async (
  payload: { email: string; otp: string },
  type: OTPFor,
) => {
  const userData = await insecurePrisma.user.findFirstOrThrow({
    where: {
      email: payload.email,
    },
    select: {
      otp: true,
      otpExpiry: true,
      otpAttempts: true,
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      otpFor: true,
    },
  });

  if ((userData.otpAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
    await clearOtp(payload.email);
    throw new AppError(
      httpStatus.TOO_MANY_REQUESTS,
      'Too many invalid OTP attempts. Please request a new code.',
    );
  }

  if (type !== userData.otpFor) {
    throw new AppError(httpStatus.FORBIDDEN, 'Invalid Otp');
  }

  if (!userData.otp || !userData.otpExpiry) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'No OTP request found for this email.',
    );
  }

  if (new Date(userData.otpExpiry).getTime() < Date.now()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'OTP has expired. Please request a new one.',
    );
  }

  const incomingHash = hashSid(payload.otp);
  if (!hashesMatch(userData.otp, incomingHash)) {
    const nextAttempts = (userData.otpAttempts ?? 0) + 1;
    if (nextAttempts >= MAX_OTP_ATTEMPTS) {
      await clearOtp(payload.email);
      throw new AppError(
        httpStatus.TOO_MANY_REQUESTS,
        'Too many invalid OTP attempts. Please request a new code.',
      );
    }

    await insecurePrisma.user.update({
      where: { email: payload.email },
      data: { otpAttempts: nextAttempts },
    });

    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Invalid OTP. Please try again.',
    );
  }

  return {
    verified: true,
    userData,
  };
};
