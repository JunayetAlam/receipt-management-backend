import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { authValidation } from './auth.validation';
import auth from '../../middlewares/auth';
import { AuthServices } from './auth.service';

const router = express.Router();

router.post(
  '/login',
  validateRequest.body(authValidation.loginUser),
  AuthServices.loginUser,
);

router.post(
  '/login-with-firebase',
  validateRequest.body(authValidation.loginWithFirebase),
  AuthServices.loginWithFirebase,
);

router.post(
  '/register',
  validateRequest.body(authValidation.registerUser),
  AuthServices.registerUser,
);

// TOKEN-BASED AUTH remnant — JWT refresh. Session idle/absolute TTL replaces this.
// router.post('/refresh-token', auth('ANY'), AuthServices.refreshToken);

router.post(
  '/verify-email',
  validateRequest.body(authValidation.verifyEmail),
  AuthServices.verifyEmail,
);

router.post(
  '/resend-verification-otp',
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
  validateRequest.body(authValidation.forgetPassword),
  AuthServices.forgetPassword,
);

router.post(
  '/verify-forgot-password-otp',
  validateRequest.body(authValidation.verifyForgotOtp),
  AuthServices.verifyForgotPassOtp,
);

router.post(
  '/reset-password',
  validateRequest.body(authValidation.resetPassword),
  AuthServices.resetPassword,
);

router.post('/logout', auth('ANY'), AuthServices.logoutUser);

router.get('/logged-in-devices', auth('ANY'), AuthServices.getLoggedInDevices);

router.delete('/devices/:id', auth('ANY'), AuthServices.removeDevice);

export const AuthByOtpRouters = router;
