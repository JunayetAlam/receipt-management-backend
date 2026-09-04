import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { receiptValidation } from './receipt.validation';
import { ReceiptServices } from './receipt.service';

const router = express.Router();

// Get all receipts (Admin, Superadmin, Cashier)
router.get('/', auth('ANY'), ReceiptServices.getAllReceipts);

// Get single receipt by ID
router.get('/:id', auth('ANY'), ReceiptServices.getReceiptById);

// Create receipt with items, pricing, inventory deduction, and initial payment
router.post(
  '/',
  auth('ANY'),
  validateRequest.body(receiptValidation.createReceiptSchema),
  ReceiptServices.createReceipt,
);

// Update receipt (Guarded: Cashiers cannot edit APPROVED receipts)
router.put(
  '/:id',
  auth('ANY'),
  validateRequest.body(receiptValidation.updateReceiptSchema),
  ReceiptServices.updateReceipt,
);

// Update receipt status (Admin and Superadmin only: Approve / Reject)
router.patch(
  '/:id/status',
  auth('SUPERADMIN', 'ADMIN'),
  validateRequest.body(receiptValidation.updateStatusSchema),
  ReceiptServices.updateReceiptStatus,
);

// Delete receipt (Immediate soft delete for Admin; Deletion request for Cashier)
router.delete(
  '/:id',
  auth('ANY'),
  validateRequest.body(receiptValidation.deleteRequestSchema),
  ReceiptServices.deleteReceipt,
);

// Confirm deletion request (Admin and Superadmin only)
router.patch(
  '/:id/confirm-delete',
  auth('SUPERADMIN', 'ADMIN'),
  ReceiptServices.confirmDeleteReceipt,
);

// Reject deletion request (Admin and Superadmin only)
router.patch(
  '/:id/reject-delete',
  auth('SUPERADMIN', 'ADMIN'),
  ReceiptServices.rejectDeleteReceipt,
);

// Restore / Undo soft-deleted receipt (Admin and Superadmin only)
router.patch(
  '/:id/restore',
  auth('SUPERADMIN', 'ADMIN'),
  ReceiptServices.restoreReceipt,
);

// Add installment or partial payment for remaining due
router.post(
  '/:id/payments',
  auth('ANY'),
  validateRequest.body(receiptValidation.addPaymentSchema),
  ReceiptServices.addPayment,
);

// Update an existing payment on a receipt
router.patch(
  '/:id/payments/:paymentId',
  auth('ANY'),
  validateRequest.body(receiptValidation.updatePaymentSchema),
  ReceiptServices.updatePayment,
);

// Approve a payment (Admin/Superadmin only)
router.patch(
  '/:id/payments/:paymentId/approve',
  auth('SUPERADMIN', 'ADMIN'),
  ReceiptServices.approvePayment,
);

// Delete a payment on a receipt (Reverts paid amount)
router.delete(
  '/:id/payments/:paymentId',
  auth('ANY'),
  ReceiptServices.deletePayment,
);

export const ReceiptRouters = router;
