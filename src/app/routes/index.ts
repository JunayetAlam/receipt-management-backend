import express from 'express';
import { UserRouters } from '../modules/User/user.routes';
import { AssetRouters } from '../modules/Asset/asset.route';
import { AuthByOtpRouters } from '../modules/AuthByOtp/auth.routes';

import { NotificationRouters } from '../modules/Notification/notification.routes';
import { ActivityLogRouters } from '../modules/ActivityLog/activityLog.routes';
import { ProductRouters } from '../modules/Product/product.routes';
import { CustomerRouters } from '../modules/Customer/customer.routes';
import { ReceiptRouters } from '../modules/Receipt/receipt.routes';
import { ShopRouters } from '../modules/Shop/shop.routes';

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
    path: '/customers',
    route: CustomerRouters,
  },
  {
    path: '/products',
    route: ProductRouters,
  },
  {
    path: '/receipts',
    route: ReceiptRouters,
  },
  {
    path: '/shops',
    route: ShopRouters,
  },
  {
    path: '/assets',
    route: AssetRouters,
  },
  {
    path: '/notifications',
    route: NotificationRouters,
  },
  {
    path: '/activity-logs',
    route: ActivityLogRouters,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;
