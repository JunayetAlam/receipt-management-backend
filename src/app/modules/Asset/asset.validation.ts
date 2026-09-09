import { z } from 'zod';

const updateAssetSchema = z.object({
  body: z.object({
    oldPath: z.string(),
    model: z.string().optional(),
  }),
});

const deleteAssetSchema = z.object({
  body: z.object({
    path: z.string({
      error: 'path is required',
    }),
  }),
});

const updateMultipleAssetsSchema = z.object({
  body: z.object({
    oldPaths: z.array(z.string().min(1)),
    model: z.string().optional(),
  }),
});

const deleteMultipleAssetsSchema = z.object({
  body: z
    .object({
      paths: z.array(z.string().min(1)).optional(),
      ids: z.array(z.string().min(1)).optional(),
    })
    .refine(
      data =>
        (Array.isArray(data.paths) && data.paths.length > 0) ||
        (Array.isArray(data.ids) && data.ids.length > 0),
      {
        message: 'Provide at least one path or id in paths or ids array',
      },
    ),
});

export const AssetValidation = {
  updateAssetSchema,
  deleteAssetSchema,
  updateMultipleAssetsSchema,
  deleteMultipleAssetsSchema,
};
