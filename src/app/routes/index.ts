import express from 'express';
import { UserRouters } from '../modules/User/user.routes';
import { AssetRouters } from '../modules/Asset/asset.route';
import { AuthByOtpRouters } from '../modules/AuthByOtp/auth.routes';

const router = express.Router();

const moduleRoutes = [
  // TOKEN-BASED AUTH remnant — link-based JWT verification. Session AuthByOtp is the default.
  // {
  //   path: '/auth',
  //   route: AuthRouters,
  // },
  {
    path: '/auth',
    route: AuthByOtpRouters,
  },
  {
    path: '/users',
    route: UserRouters,
  },
  {
    path: '/assets',
    route: AssetRouters,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
