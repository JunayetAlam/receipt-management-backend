import express from 'express';
import { UserRouters } from '../modules/User/user.routes';
import { AssetRouters } from '../modules/Asset/asset.route';
import { AuthByOtpRouters } from '../modules/AuthByOtp/auth.routes';

const router = express.Router();

const moduleRoutes = [
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
