import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { customerValidation } from './customer.validation';
import { CustomerServices } from './customer.service';

const router = express.Router();

// Get all customers (Admin, Superadmin, Cashier)
router.get('/', auth('ANY'), CustomerServices.getAllCustomers);

// Fast customer lookup by phone (before /:id)
router.get('/lookup-phone', auth('ANY'), CustomerServices.lookupCustomerByPhone);

// Get single customer
router.get('/:id', auth('ANY'), CustomerServices.getCustomerById);

// Create customer (Admin, Superadmin, Cashier)
router.post(
  '/',
  auth('ANY'),
  validateRequest.body(customerValidation.createCustomerSchema),
  CustomerServices.createCustomer,
);

// Update customer
router.put(
  '/:id',
  auth('ANY'),
  validateRequest.body(customerValidation.updateCustomerSchema),
  CustomerServices.updateCustomer,
);

// Delete customer (Immediate delete for Admin; Deletion request for Cashier)
router.delete(
  '/:id',
  auth('ANY'),
  validateRequest.body(customerValidation.deleteRequestSchema),
  CustomerServices.deleteCustomer,
);

// Confirm deletion (Admin and Superadmin only)
router.patch(
  '/:id/confirm-delete',
  auth('SUPERADMIN', 'ADMIN'),
  CustomerServices.confirmDeleteCustomer,
);

// Reject deletion request (Admin and Superadmin only)
router.patch(
  '/:id/reject-delete',
  auth('SUPERADMIN', 'ADMIN'),
  CustomerServices.rejectDeleteCustomer,
);

// Restore / Undo soft-deleted customer (Admin and Superadmin only)
router.patch(
  '/:id/restore',
  auth('SUPERADMIN', 'ADMIN'),
  CustomerServices.restoreCustomer,
);

export const CustomerRouters = router;
