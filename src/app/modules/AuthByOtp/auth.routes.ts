import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { authValidation } from './auth.validation';
import auth from '../../middlewares/auth';
import { AuthServices } from './auth.service';
import { authLimiter, otpLimiter } from '../../middlewares/authRateLimit';

const router = express.Router();

router.post(
  '/login',
  authLimiter,
  validateRequest.body(authValidation.loginUser),
  AuthServices.loginUser,
);

router.post(
  '/login-with-firebase',
  authLimiter,
  validateRequest.body(authValidation.loginWithFirebase),
  AuthServices.loginWithFirebase,
);

router.post(
  '/register',
  otpLimiter,
  validateRequest.body(authValidation.registerUser),
  AuthServices.registerUser,
);

router.post(
  '/verify-email',
  authLimiter,
  validateRequest.body(authValidation.verifyEmail),
  AuthServices.verifyEmail,
);

router.post(
  '/resend-verification-otp',
  otpLimiter,
  validateRequest.body(authValidation.resendOtp),
  AuthServices.resendVerificationOtpToNumber,
);

router.patch(
  '/change-password',
  auth('ANY'),
  validateRequest.body(authValidation.changePassword),
  AuthServices.changePassword,
);

router.post(
  '/forget-password',
  otpLimiter,
  validateRequest.body(authValidation.forgetPassword),
  AuthServices.forgetPassword,
);

router.post(
  '/verify-forgot-password-otp',
  authLimiter,
  validateRequest.body(authValidation.verifyForgotOtp),
  AuthServices.verifyForgotPassOtp,
);

router.post(
  '/reset-password',
  authLimiter,
  validateRequest.body(authValidation.resetPassword),
  AuthServices.resetPassword,
);

router.post('/logout', auth('ANY'), AuthServices.logoutUser);

router.get('/logged-in-devices', auth('ANY'), AuthServices.getLoggedInDevices);

router.delete('/devices/:id', auth('ANY'), AuthServices.removeDevice);

export const AuthByOtpRouters = router;
