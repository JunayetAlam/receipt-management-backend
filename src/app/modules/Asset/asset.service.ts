import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import {
  deleteFromLocalStorage,
  deleteMultipleFromLocalStorage,
  uploadMultipleToLocalStorage,
  uploadToLocalStorage,
} from '../Upload/uploadToLocalStorage';
import { deleteFromCloudinary, deleteMultipleByUrl } from '../Upload/uploadToCloudinary';

interface ImageData {
  name: string;
  url: string;
}

export function getImageDataFromUrl(imageUrl: string): ImageData {
  const parts = imageUrl.split('/');
  const fileName = parts[parts.length - 1] || 'unknown';

  return {
    name: fileName,
    url: imageUrl,
  };
}

const getRequestModel = (req: any): string => {
  return (req.body?.model || req.query?.model || 'general').toString();
};

const uploadAsset = catchAsync(async (req, res) => {
  const file = req.file;
  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Provide at least one asset');
  }

  const model = getRequestModel(req);
  const location = await uploadToLocalStorage(file, model);
  const url = getImageDataFromUrl(location.Location);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'File uploaded successfully',
    data: { url },
  });
});

const uploadMultipleAssets = catchAsync(async (req, res) => {
  const files = (req.files as Express.Multer.File[]) || undefined;
  if (!files || files.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Provide at least one asset');
  }

  const model = getRequestModel(req);
  const locations = await uploadMultipleToLocalStorage(files, model);
  const urls = locations.map(item => getImageDataFromUrl(item.Location));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Files uploaded successfully',
    data: { urls },
  });
});

const deleteAsset = catchAsync(async (req, res) => {
  const targetPath =
    req.body?.path || req.params?.path || (req.query?.path as string);
  if (!targetPath) {
    throw new AppError(httpStatus.BAD_REQUEST, 'File path is required');
  }

  // Attempt local storage delete first
  let success = await deleteFromLocalStorage(targetPath);

  // If not local or is a legacy Cloudinary URL, attempt Cloudinary delete
  if (!success && typeof targetPath === 'string' && targetPath.includes('cloudinary.com')) {
    await deleteFromCloudinary(targetPath);
    success = true;
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'File deleted successfully',
    data: { success: true },
  });
});

const deleteMultipleAssets = catchAsync(async (req, res) => {
  const paths: string[] = req.body?.paths || req.body?.ids || [];
  if (!paths || paths.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Provide at least one path to delete');
  }

  const localPaths: string[] = [];
  const cloudinaryPaths: string[] = [];

  paths.forEach(p => {
    if (typeof p === 'string' && p.includes('cloudinary.com')) {
      cloudinaryPaths.push(p);
    } else {
      localPaths.push(p);
    }
  });

  const deletedLocal = await deleteMultipleFromLocalStorage(localPaths);
  let deletedCloudinary = null;
  if (cloudinaryPaths.length > 0) {
    deletedCloudinary = await deleteMultipleByUrl(cloudinaryPaths);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Files deleted successfully',
    data: { deleted: { local: deletedLocal, cloudinary: deletedCloudinary } },
  });
});

const updateAsset = catchAsync(async (req, res) => {
  const oldPath = req.body.oldPath;
  const newFile = req.file;
  if (!newFile) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Provide a new file to update the asset',
    );
  }

  const model = getRequestModel(req);
  const newLocation = await uploadToLocalStorage(newFile, model);

  if (oldPath) {
    if (typeof oldPath === 'string' && oldPath.includes('cloudinary.com')) {
      deleteFromCloudinary(oldPath);
    } else {
      deleteFromLocalStorage(oldPath);
    }
  }

  const url = getImageDataFromUrl(newLocation.Location);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'File updated successfully',
    data: { url },
  });
});

const updateMultipleAssets = catchAsync(async (req, res) => {
  const { oldPaths } = req.body;
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Provide new files to update the assets',
    );
  }

  const model = getRequestModel(req);
  const newLocations = await uploadMultipleToLocalStorage(files, model);

  if (Array.isArray(oldPaths) && oldPaths.length > 0) {
    const localPaths: string[] = [];
    const cloudinaryPaths: string[] = [];
    oldPaths.forEach(p => {
      if (typeof p === 'string' && p.includes('cloudinary.com')) {
        cloudinaryPaths.push(p);
      } else {
        localPaths.push(p);
      }
    });

    if (localPaths.length > 0) deleteMultipleFromLocalStorage(localPaths);
    if (cloudinaryPaths.length > 0) deleteMultipleByUrl(cloudinaryPaths);
  }

  const urls = newLocations.map(item => getImageDataFromUrl(item.Location));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Files updated successfully',
    data: { urls },
  });
});

export const AssetServices = {
  upload: uploadAsset,
  uploadMultiple: uploadMultipleAssets,
  delete: deleteAsset,
  deleteMultiple: deleteMultipleAssets,
  update: updateAsset,
  updateMultiple: updateMultipleAssets,
};
