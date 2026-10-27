import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { shopValidation } from './shop.validation';
import { ShopServices } from './shop.service';

const router = express.Router();

// Public shop info for the homepage (no auth)
router.get('/public', ShopServices.getPublicShopDetails);

// Get shop details (accessible to any authenticated user)
router.get('/', auth('ANY'), ShopServices.getShopDetails);

// Upsert shop details (Superadmin and Admin only)
router.put(
  '/upsert',
  auth('SUPERADMIN', 'ADMIN'),
  validateRequest.body(shopValidation.upsertShopSchema),
  ShopServices.upsertShopDetails,
);

router.put(
  '/',
  auth('SUPERADMIN', 'ADMIN'),
  validateRequest.body(shopValidation.upsertShopSchema),
  ShopServices.upsertShopDetails,
);

export const ShopRouters = router;
