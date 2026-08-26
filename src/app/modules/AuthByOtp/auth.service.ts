import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import httpStatus from 'http-status';
import config from '../../../config';
import AppError from '../../errors/AppError';
import { insecurePrisma, prisma } from '../../utils/prisma';
import { generateOTP, otpExpiryTime } from '../../utils/otp';
import { verifyOtp } from '../../utils/verifyOtp';
import { sendOtp } from '../../utils/sendOtp';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { createSessionUtil, resendOtpUtil, toAuthUser } from './auth.utils';
import { clearAuthCookies, setSessionCookie } from '../../utils/cookieOptions';
import {
  createSession,
  destroyAllUserSessions,
  destroySession,
  destroyUserSessionById,
  hashSid,
  listUserSessions,
} from '../../utils/sessions';
import { firebaseAuth } from '../../utils/firebase';
import { FirebaseProvider, User } from '../../../generated/prisma/client';

// TOKEN-BASED AUTH remnant:
// import { Secret, SignOptions, JwtPayload } from 'jsonwebtoken';
// import jwt from 'jsonwebtoken';
// import { generateToken } from '../../utils/token/generateToken';
// import { generateRefreshToken } from '../../utils/token/generateRefreshToken';

const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;

const loginWithFirebase = catchAsync(async (req, res) => {
  const { idToken } = req.body;
  let decodedToken;
  try {
    decodedToken = await firebaseAuth.verifyIdToken(idToken);
  } catch (error) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'Invalid or expired Firebase ID token',
    );
  }

  const { uid, email, name, picture, providerId } = decodedToken;
  const firstName = name?.split(' ')[0];
  const lastName = name?.split(' ')[1];

  const normalizedProvider = providerId?.toUpperCase();
  const provider: FirebaseProvider = ['GOOGLE', 'FACEBOOK'].includes(
    normalizedProvider,
  )
    ? (normalizedProvider as FirebaseProvider)
    : FirebaseProvider.GOOGLE;

  if (!email) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Email is required for social login',
    );
  }

  let user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (user) {
    if (user.status === 'BLOCKED') {
      throw new AppError(httpStatus.FORBIDDEN, 'Account has been blocked');
    }
    if (user.isDeleted) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'Account has been deleted. Please contact support to reactivate your account',
      );
    } else {
      if (user.loginWay === 'EMAIL') {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'Email already in use with different login method',
        );
      }
    }
  } else {
    user = await prisma.user.create({
      data: {
        email: email,
        firstName: firstName || '',
        lastName: lastName || '',
        profilePhoto: picture,
        isAgreeWithTerms: true,
        isEmailVerified: true,
        firebaseProvider: provider,
        firebaseUid: uid,
        loginWay: 'FIREBASE',
      },
    });
  }
  await createSessionUtil(user as User, req, res);
});

const INVALID_CREDENTIALS = 'Invalid email or password';
const FORGOT_PASSWORD_MESSAGE =
  'If an account exists, a verification code has been sent.';

const loginUser = catchAsync(async (req, res) => {
  const payload = req.body;
  const userData = await insecurePrisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (
    !userData ||
    userData.isDeleted ||
    userData.status === 'BLOCKED' ||
    userData.loginWay === 'FIREBASE'
  ) {
    throw new AppError(httpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
  }

  const isCorrectPassword = await bcrypt.compare(
    payload.password,
    userData.password || '',
  );

  if (!isCorrectPassword) {
    throw new AppError(httpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
  }

  if (userData.role !== 'SUPERADMIN' && !userData.isEmailVerified) {
    await resendOtpUtil(userData.email);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Please verify your email. A verification code has been sent.',
      data: {
        message: 'Please verify your email. A verification code has been sent.',
      },
    });
    return;
  }

  // TOKEN-BASED AUTH remnant:
  // const result = await generateRefreshToken(userData.email, userData);
  // sendResponse(res, { statusCode: httpStatus.OK, message: 'User logged in successfully', data: result });

  await createSessionUtil(userData, req, res);
});

const registerUser = catchAsync(async (req, res) => {
  const payload = req.body;
  if (payload.role == 'SUPERADMIN') {
    throw new AppError(
      httpStatus.NOT_ACCEPTABLE,
      'User can only pass User and Provider',
    );
  }
  const hashedPassword: string = await bcrypt.hash(payload.password, 12);

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: payload.email }, { phoneNumber: payload.phoneNumber }],
    },
    select: {
      id: true,
      email: true,
      phoneNumber: true,
      isDeleted: true,
    },
  });

  if (existingUser) {
    if (existingUser.email === payload.email) {
      if (existingUser.isDeleted) {
        throw new AppError(
          httpStatus.CONFLICT,
          'User already exists with the email and its deleted. Please contact support to reactivate your account',
        );
      }
      throw new AppError(
        httpStatus.CONFLICT,
        'User already exists with the email',
      );
    }
    throw new AppError(
      httpStatus.CONFLICT,
      'User already exists with the phone number',
    );
  }

  const otp = generateOTP();
  const userData = {
    ...payload,
    password: hashedPassword,
    otp: hashSid(otp),
    otpExpiry: otpExpiryTime(),
    otpAttempts: 0,
  };

  await prisma.$transaction(async tx => {
    await tx.user.create({
      data: {
        ...userData,
        otpFor: 'USER_VERIFICATION',
      },
    });
  });

  if (config.env === 'development') {
    console.log(`[DEV OTP] ${payload.email} => ${otp}`);
  }

  try {
    await sendOtp({ email: userData.email, otp });
  } catch (mailErr) {
    if (config.env === 'development') {
      console.error(
        '[EMAIL] SMTP failed during register. Update MAIL / MAIL_PASS with a valid Gmail App Password.',
        mailErr,
      );
      sendResponse(res, {
        statusCode: httpStatus.CREATED,
        message:
          'Account created, but email could not be sent. Check MAIL_PASS (Gmail App Password).',
        data: {
          message: 'Please check your email to verify your account',
        },
      });
      return;
    }
    throw mailErr;
  }

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'User Register Successfully. Check your mail to verify',
    data: {
      message: 'Please check your Email to verify your account',
    },
  });
});

const verifyEmail = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  const { userData } = await verifyOtp({ email, otp }, 'USER_VERIFICATION');
  await prisma.user.update({
    where: {
      email: userData.email,
    },
    data: {
      otp: null,
      otpExpiry: null,
      isEmailVerified: true,
      otpFor: 'NOT',
      otpAttempts: 0,
    },
    select: {
      id: true,
    },
  });

  // TOKEN-BASED AUTH remnant:
  // const accessToken = await generateToken(
  //   { id: userData.id, name: userData.firstName + userData.lastName, email: userData.email, role: userData.role },
  //   config.jwt.access_secret as Secret,
  //   config.jwt.access_expires_in as SignOptions['expiresIn'],
  // );
  // sendResponse(res, { statusCode: httpStatus.OK, message: 'Email verified successfully', data: { ...toAuthUser(userData), accessToken } });

  const { sid, session } = await createSession({
    userId: userData.id,
    req,
  });
  setSessionCookie(res, sid, session.createdAt);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Email verified successfully',
    data: toAuthUser(userData),
  });
});

const resendVerificationOtpToNumber = catchAsync(async (req, res) => {
  const { email } = req.body;
  const result = await resendOtpUtil(email);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: result.message,
    data: {
      message: result.message,
    },
  });
});

const changePassword = catchAsync(async (req, res) => {
  const { user } = req;
  const payload = req.body;
  const userData = await insecurePrisma.user.findUniqueOrThrow({
    where: {
      email: user.email,
      status: 'ACTIVE',
    },
  });

  if (userData.isDeleted) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Account has been deleted. Please contact support to reactivate your account',
    );
  }

  if (userData.status === 'BLOCKED') {
    throw new AppError(httpStatus.FORBIDDEN, 'Account has been blocked');
  }

  if (userData.loginWay === 'FIREBASE') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Email already in use with different login method',
    );
  }

  const isCorrectPassword: boolean = await bcrypt.compare(
    payload.oldPassword,
    userData.password || '',
  );

  if (!isCorrectPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Old Password is incorrect');
  }

  const hashedPassword: string = await bcrypt.hash(payload.newPassword, 12);

  await prisma.user.update({
    where: {
      id: userData.id,
    },
    data: {
      password: hashedPassword,
    },
  });

  await destroyAllUserSessions(userData.id);
  clearAuthCookies(res);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    data: {
      message: 'Password changed successfully!',
    },
  });
});

const forgetPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await insecurePrisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (
    user &&
    user.isEmailVerified &&
    !user.isDeleted &&
    user.status !== 'BLOCKED' &&
    user.loginWay !== 'FIREBASE'
  ) {
    const otp = generateOTP();

    if (config.env === 'development') {
      console.log(`[DEV OTP] ${email} => ${otp}`);
    }

    await prisma.user.update({
      where: { email: email },
      data: {
        otp: hashSid(otp),
        otpExpiry: otpExpiryTime(),
        otpFor: 'FORGOT_PASSWORD',
        otpAttempts: 0,
      },
    });

    await sendOtp({ email: user.email, otp });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    data: {
      message: FORGOT_PASSWORD_MESSAGE,
    },
  });
});

const verifyForgotPassOtp = catchAsync(async (req, res) => {
  const payload = req.body;

  await verifyOtp(payload, 'FORGOT_PASSWORD');
  const resetToken = randomBytes(32).toString('hex');

  // TOKEN-BASED AUTH remnant:
  // const resetToken = generateToken(
  //   { id: userData.id, name: userData.firstName + userData.lastName, email: userData.email, role: userData.role },
  //   config.jwt.access_secret as Secret,
  //   '600s',
  // );

  await prisma.user.update({
    where: {
      email: payload.email,
    },
    data: {
      otp: null,
      otpExpiry: null,
      passwordResetToken: hashSid(resetToken),
      passwordResetTokenExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      otpFor: 'NOT',
      otpAttempts: 0,
    },
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'OTP verified successfully',
    data: { resetToken, expireInMinutes: 10 },
  });
});

const resetPassword = catchAsync(async (req, res) => {
  const payload = req.body;
  const token = payload.token;
  if (!token) {
    throw new AppError(httpStatus.FORBIDDEN, 'Token is missing!');
  }

  const userData = await insecurePrisma.user.findFirstOrThrow({
    where: {
      email: payload.email,
    },
  });

  if (userData.loginWay === 'FIREBASE') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Email already in use with different login method',
    );
  }

  // TOKEN-BASED AUTH remnant — reset token previously came from Authorization header JWT:
  // const token = req.headers.authorization as string;
  // if (token !== userData.passwordResetToken) throw new AppError(httpStatus.FORBIDDEN, 'Invalid token');
  // const decoded = jwt.verify(token, config.jwt.access_secret as string) as JwtPayload;

  if (
    !userData.passwordResetToken ||
    !userData.passwordResetTokenExpires ||
    userData.passwordResetTokenExpires < new Date() ||
    hashSid(token) !== userData.passwordResetToken
  ) {
    throw new AppError(httpStatus.FORBIDDEN, 'Invalid token');
  }

  if (userData.isDeleted) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Account has been deleted. Please contact support to reactivate your account',
    );
  }

  if (userData.status === 'BLOCKED') {
    throw new AppError(httpStatus.FORBIDDEN, 'User has blocked');
  }

  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  await prisma.user.update({
    where: {
      email: payload.email,
    },
    data: {
      password: newHashedPassword,
      passwordResetToken: null,
      passwordResetTokenExpires: null,
    },
  });

  await destroyAllUserSessions(userData.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    data: { message: 'Password reset successfully' },
  });
});

const logoutUser = catchAsync(async (req, res) => {
  const sid = req.cookies?.[config.session.cookie_name] as string | undefined;
  await destroySession(sid);
  clearAuthCookies(res);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User logged out successfully',
    data: '',
  });
});

const getLoggedInDevices = catchAsync(async (req, res) => {
  const sid = req.cookies?.[config.session.cookie_name] as string | undefined;
  const currentHash = sid ? hashSid(sid) : null;
  const sessions = await listUserSessions(req.user.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Logged in devices retrieved successfully',
    data: sessions.map(({ tokenHash, ...device }) => ({
      ...device,
      isCurrent: Boolean(currentHash && tokenHash === currentHash),
    })),
  });
});

const removeDevice = catchAsync(async (req, res) => {
  const sid = req.cookies?.[config.session.cookie_name] as string | undefined;
  const session = await destroyUserSessionById(req.user.id, req.params.id);

  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, 'Device session not found');
  }

  const isCurrent = Boolean(sid && hashSid(sid) === session.tokenHash);
  if (isCurrent) {
    clearAuthCookies(res);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: isCurrent
      ? 'Current device logged out successfully'
      : 'Device removed successfully',
    data: { id: session.id, isCurrent },
  });
});

// TOKEN-BASED AUTH remnant:
// const refreshToken = catchAsync(async (req, res) => {
//   const result = await generateRefreshToken(req.user.email);
//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     message: 'Token Refresh Successfully',
//     data: result,
//   });
// });

export const AuthServices = {
  loginWithFirebase,
  loginUser,
  registerUser,
  changePassword,
  forgetPassword,
  resetPassword,
  resendVerificationOtpToNumber,
  verifyEmail,
  verifyForgotPassOtp,
  logoutUser,
  getLoggedInDevices,
  removeDevice,
  // refreshToken,
};
