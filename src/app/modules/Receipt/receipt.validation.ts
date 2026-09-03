import { z } from 'zod';
import { ProductUnit, ReceiptStatus } from '../../../generated/prisma/client';

const productUnitEnum = z.nativeEnum(ProductUnit);
const receiptStatusEnum = z.nativeEnum(ReceiptStatus);

const receiptItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  productName: z.string({ error: 'Product name is required' }).min(1, 'Product name cannot be empty'),
  unit: productUnitEnum.default(ProductUnit.PIECE),
  sellingPrice: z.number({ error: 'Selling price is required' }).nonnegative('Selling price cannot be negative'),
  buyingPrice: z.number().nonnegative().optional().nullable(),
  quantity: z.number({ error: 'Quantity is required' }).positive('Quantity must be greater than 0'),
  discount: z.number().min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100%').default(0),
});

const createReceiptSchema = z.object({
  body: z
    .object({
      customerId: z.string().uuid('Invalid customer ID').optional().nullable(),
      countryCode: z.string().regex(/^\+[0-9]{1,4}$/, 'Invalid country code format').optional().nullable(),
      customerPhone: z.string().min(4, 'Phone number must be at least 4 digits').max(20).optional().nullable(),
      customerName: z.string().min(1).max(100).optional().nullable(),
      customerAddress: z.string().max(300).optional().nullable(),
      customerEmail: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
      items: z.array(receiptItemSchema).min(1, 'At least one item is required in the receipt'),
      discount: z.number().min(0, 'Overall discount cannot be negative').default(0),
      paidAmount: z.number().min(0, 'Paid amount cannot be negative').default(0),
      note: z.string().max(500, 'Note is too long').optional().nullable(),
    })
    .refine(data => data.customerId || data.customerPhone, {
      message: 'Either customerId or customerPhone is required',
      path: ['customerId'],
    }),
});

const updateReceiptSchema = z.object({
  body: z.object({
    customerId: z.string().uuid().optional().nullable(),
    countryCode: z.string().regex(/^\+[0-9]{1,4}$/, 'Invalid country code format').optional().nullable(),
    customerPhone: z.string().min(4).max(20).optional().nullable(),
    customerName: z.string().min(1).max(100).optional().nullable(),
    customerAddress: z.string().max(300).optional().nullable(),
    customerEmail: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
    status: receiptStatusEnum.optional(),
    items: z.array(receiptItemSchema).min(1, 'At least one item is required').optional(),
    discount: z.number().min(0).optional(),
    paidAmount: z.number().min(0).optional(),
    note: z.string().max(500).optional().nullable(),
  }),
});

const addPaymentSchema = z.object({
  body: z.object({
    amount: z.number({ error: 'Payment amount is required' }).positive('Amount must be greater than 0'),
    note: z.string().max(500, 'Note is too long').optional().nullable(),
  }),
});

const deleteRequestSchema = z.object({
  body: z.object({
    reason: z.string().max(300, 'Reason cannot exceed 300 characters').optional(),
  }),
});

export const receiptValidation = {
  createReceiptSchema,
  updateReceiptSchema,
  addPaymentSchema,
  deleteRequestSchema,
};
