import { z } from 'zod';
import { ProductUnit } from '../../../generated/prisma/client';

const productUnitEnum = z.nativeEnum(ProductUnit);

const createProductSchema = z.object({
  body: z.object({
    name: z.string({ error: 'Product name is required' }).min(1, 'Product name cannot be empty').max(100),
    unit: productUnitEnum.default(ProductUnit.PIECE),
    sellingPrice: z.number({ error: 'Selling price is required' }).positive('Selling price must be greater than 0'),
    buyingPrice: z.number().nonnegative('Buying price cannot be negative').optional().nullable(),
    stock: z.number().nonnegative('Stock cannot be negative').default(0),
    description: z.string().max(500, 'Description is too long').optional().nullable(),
  }),
});

const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    unit: productUnitEnum.optional(),
    sellingPrice: z.number().positive().optional(),
    buyingPrice: z.number().nonnegative().optional().nullable(),
    stock: z.number().nonnegative().optional(),
    description: z.string().max(500).optional().nullable(),
  }),
});

const deleteRequestSchema = z.object({
  body: z.object({
    reason: z.string().max(300).optional(),
  }),
});

const bulkCreateProductItemSchema = z.object({
  name: z.string({ error: 'Product name is required' }).min(1, 'Product name cannot be empty').max(100),
  unit: productUnitEnum.default(ProductUnit.PIECE),
  sellingPrice: z.number({ error: 'Selling price is required' }).positive('Selling price must be greater than 0'),
  buyingPrice: z.number().nonnegative('Buying price cannot be negative').optional().nullable(),
  stock: z.number().nonnegative('Stock cannot be negative').default(0),
  description: z.string().max(500, 'Description is too long').optional().nullable(),
});

const bulkCreateProductsSchema = z.object({
  body: z.object({
    products: z
      .array(bulkCreateProductItemSchema)
      .min(1, 'At least one product is required')
      .max(500, 'Cannot upload more than 500 products at once'),
  }),
});

export const productValidation = {
  createProductSchema,
  updateProductSchema,
  deleteRequestSchema,
  bulkCreateProductsSchema,
};

