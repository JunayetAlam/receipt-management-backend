import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { userValidation } from './user.validation';
import { uploadMiddleware } from '../Upload/upload.middleware';
import { UserServices } from './user.service';

const router = express.Router();

router.get('/', auth('SUPERADMIN', 'ADMIN'), UserServices.getAllUsers);
router.post(
  '/',
  auth('SUPERADMIN', 'ADMIN'),
  validateRequest.body(userValidation.createUser),
  UserServices.createUser,
);
router.get('/me', auth('ANY'), UserServices.getMyProfile);

router.put(
  '/update-profile',
  auth('ANY'),
  validateRequest.body(userValidation.updateUser),
  UserServices.updateMyProfile,
);

router.put(
  '/update-profile-image',
  auth('ANY'),
  uploadMiddleware.single('file'),
  UserServices.updateProfileImage,
);

router.put(
  '/undelete-user/:id',
  auth('SUPERADMIN', 'ADMIN'),
  UserServices.undeletedUser,
);

router.get(
  '/:id/devices',
  auth('SUPERADMIN', 'ADMIN'),
  UserServices.getUserDevices,
);

router.delete(
  '/:id/devices/:sessionId',
  auth('SUPERADMIN', 'ADMIN'),
  UserServices.revokeUserDevice,
);

router.post(
  '/:id/logout',
  auth('SUPERADMIN', 'ADMIN'),
  UserServices.logoutUserSessions,
);

router.put(
  '/:id/role',
  auth('SUPERADMIN'),
  validateRequest.body(userValidation.updateUserRoleSchema),
  UserServices.updateUserRole,
);

router.put(
  '/:id/status',
  auth('SUPERADMIN', 'ADMIN'),
  validateRequest.body(userValidation.updateUserStatus),
  UserServices.updateUserStatus,
);

router.delete('/:id', auth('SUPERADMIN', 'ADMIN'), UserServices.deleteUser);

router.get('/:id', auth('SUPERADMIN', 'ADMIN'), UserServices.getUserDetails);

export const UserRouters = router;
