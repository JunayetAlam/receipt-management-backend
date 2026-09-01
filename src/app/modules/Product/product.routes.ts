import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { productValidation } from './product.validation';
import { ProductServices } from './product.service';

const router = express.Router();

// Get all products (Admin, Superadmin, Cashier)
router.get('/', auth('ANY'), ProductServices.getAllProducts);

// Get single product
router.get('/:id', auth('ANY'), ProductServices.getProductById);

// Create product (Admin, Superadmin, Cashier)
router.post(
  '/',
  auth('ANY'),
  validateRequest.body(productValidation.createProductSchema),
  ProductServices.createProduct,
);

// Update product
router.put(
  '/:id',
  auth('ANY'),
  validateRequest.body(productValidation.updateProductSchema),
  ProductServices.updateProduct,
);

// Delete product (Immediate delete for Admin; Deletion request for Cashier)
router.delete(
  '/:id',
  auth('ANY'),
  validateRequest.body(productValidation.deleteRequestSchema),
  ProductServices.deleteProduct,
);

// Confirm deletion (Admin and Superadmin only)
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

// Restore / Undo soft-deleted product (Admin and Superadmin only)
router.patch(
  '/:id/restore',
  auth('SUPERADMIN', 'ADMIN'),
  ProductServices.restoreProduct,
);

export const ProductRouters = router;
