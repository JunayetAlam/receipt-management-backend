import { z } from 'zod';
import { ProductUnit } from '../../../generated/prisma/client';
import { productProfitSortFields } from './product.constant';

const productUnitEnum = z.nativeEnum(ProductUnit);

const isRealCalendarDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
};

const isoDateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine(isRealCalendarDate, 'Invalid calendar date');

const productProfitQueryFields = z
  .object({
    startDate: isoDateOnly.optional(),
    endDate: isoDateOnly.optional(),
    searchTerm: z.string().trim().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(25),
    sortBy: z.enum(productProfitSortFields).default('profit'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startDate cannot be after endDate',
        path: ['startDate'],
      });
    }
  });

export type ProductProfitQuery = z.infer<typeof productProfitQueryFields>;

export const parseProductProfitQuery = (query: unknown): ProductProfitQuery =>
  productProfitQueryFields.parse(query);

/** Shape expected by validateRequest.query (wraps query as `body`). */
const productProfitQuerySchema = z.object({
  body: productProfitQueryFields,
});


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
  productProfitQuerySchema,
};

