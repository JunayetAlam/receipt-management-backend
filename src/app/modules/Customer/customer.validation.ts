import { z } from 'zod';

const createCustomerSchema = z.object({
  body: z.object({
    name: z
      .string({ error: 'Customer name is required' })
      .min(1, 'Name cannot be empty')
      .max(100, 'Name is too long'),
    countryCode: z.string().regex(/^\+[0-9]{1,4}$/, 'Invalid country code format').default('+880').optional(),
    phoneNumber: z
      .string({ error: 'Phone number is required' })
      .min(4, 'Phone number is too short')
      .max(20, 'Phone number is too long'),
    email: z
      .string()
      .email('Invalid email address')
      .optional()
      .nullable()
      .or(z.literal('')),
    address: z
      .string()
      .max(300, 'Address is too long')
      .optional()
      .nullable(),
  }),
});

const updateCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    countryCode: z.string().regex(/^\+[0-9]{1,4}$/, 'Invalid country code format').optional(),
    phoneNumber: z.string().min(4).max(20).optional(),
    email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
    address: z.string().max(300).optional().nullable(),
  }),
});

const deleteRequestSchema = z.object({
  body: z.object({
    reason: z.string().max(300).optional(),
  }),
});

export const customerValidation = {
  createCustomerSchema,
  updateCustomerSchema,
  deleteRequestSchema,
};
