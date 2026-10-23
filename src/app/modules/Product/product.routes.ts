import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { productValidation } from './product.validation';
import { ProductServices } from './product.service';

const router = express.Router();

// Get all products (Admin, Superadmin, Cashier)
router.get('/', auth('ANY'), ProductServices.getAllProducts);

// Slim product list for pickers/search dropdowns (must be before /:id)
router.get('/options', auth('ANY'), ProductServices.getProductOptions);

// Product catalog stats (must be before /:id)
router.get('/stats', auth('ANY'), ProductServices.getProductStats);

// Product profit/loss report (must be before /:id)
router.get(
  '/profit',
  auth('SUPERADMIN', 'ADMIN'),
  validateRequest.query(productValidation.productProfitQuerySchema),
  ProductServices.getProductProfit,
);

// Get single product
router.get('/:id', auth('ANY'), ProductServices.getProductById);

// Create product (Admin, Superadmin, Cashier)
router.post(
  '/',
  auth('ANY'),
  validateRequest.body(productValidation.createProductSchema),
  ProductServices.createProduct,
);

// Bulk create products (Admin, Superadmin, Cashier)
router.post(
  '/bulk',
  auth('ANY'),
  validateRequest.body(productValidation.bulkCreateProductsSchema),
  ProductServices.bulkCreateProducts,
);

// Update product
router.put(
  '/:id',
  auth('ANY'),
  validateRequest.body(productValidation.updateProductSchema),
  ProductServices.updateProduct,
);

// Permanently delete ALL archived products ("Clear all") - Superadmin only (must be before /:id)
router.delete(
  '/archived/clear',
  auth('SUPERADMIN'),
  ProductServices.clearArchivedProducts,
);

// Permanently delete one archived product - Superadmin only
router.delete(
  '/:id/permanent',
  auth('SUPERADMIN'),
  ProductServices.permanentDeleteProduct,
);

// Delete product (Archive for Admin; Deletion request for Cashier)
router.delete(
  '/:id',
  auth('ANY'),
  validateRequest.body(productValidation.deleteRequestSchema),
  ProductServices.deleteProduct,
);

// Confirm deletion request -> archives the product (Admin and Superadmin only)
router.patch(
  '/:id/confirm-delete',
  auth('SUPERADMIN', 'ADMIN'),
  ProductServices.confirmDeleteProduct,
);

// Reject deletion request (Admin and Superadmin only)
router.patch(
  '/:id/reject-delete',
  auth('SUPERADMIN', 'ADMIN'),
  ProductServices.rejectDeleteProduct,
);

// Restore (un-archive) an archived product (Admin and Superadmin only)
router.patch(
  '/:id/restore',
  auth('SUPERADMIN', 'ADMIN'),
  ProductServices.restoreProduct,
);

export const ProductRouters = router;
