import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { prisma } from '../../utils/prisma';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { NotificationType, UserRoleEnum } from '../../../generated/prisma/client';
import { logActivity } from '../../utils/activityLog';
import { notifyAdmins, sendNotification } from '../../utils/notification';
import { customerSearchableFields } from './customer.constant';

const createCustomer = catchAsync(async (req, res) => {
  const actor = req.user;
  const payload = req.body;

  // Check if customer with phone number already exists
  const existing = await prisma.customer.findUnique({
    where: { phoneNumber: payload.phoneNumber },
  });

  if (existing) {
    if (existing.isDeleted) {
      throw new AppError(
        httpStatus.CONFLICT,
        'A customer with this phone number was previously deleted. Please restore the customer record instead.',
      );
    }
    throw new AppError(
      httpStatus.CONFLICT,
      'A customer with this phone number already exists.',
    );
  }

  const customer = await prisma.customer.create({
    data: {
      name: payload.name,
      phoneNumber: payload.phoneNumber,
      email: payload.email || null,
      address: payload.address || null,
      createdById: actor.id,
      updatedById: actor.id,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  logActivity({
    userId: actor.id,
    action: 'CREATE_CUSTOMER',
    entityType: 'CUSTOMER',
    entityId: customer.id,
    req,
    details: {
      name: customer.name,
      phoneNumber: customer.phoneNumber,
      email: customer.email,
      address: customer.address,
    },
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Customer created successfully',
    data: customer,
  });
});

const getAllCustomers = catchAsync(async (req, res) => {
  const actor = req.user;
  const query: Record<string, unknown> = { ...req.query };

  // For cashiers, default isDeleted to false unless admin requests deleted items
  if (actor.role === UserRoleEnum.CASHIER || query.isDeleted === undefined) {
    query.isDeleted = false;
  } else if (query.isDeleted === 'true') {
    query.isDeleted = true;
  } else if (query.isDeleted === 'false') {
    query.isDeleted = false;
  }

  if (query.isDeleteRequested === 'true') {
    query.isDeleteRequested = true;
  } else if (query.isDeleteRequested === 'false') {
    query.isDeleteRequested = false;
  }

  const customersQuery = new QueryBuilder<typeof prisma.customer>(
    prisma.customer,
    query,
  );

  const result = await customersQuery
    .search(customerSearchableFields)
    .filter()
    .sort()
    .customFields({
      id: true,
      name: true,
      phoneNumber: true,
      email: true,
      address: true,
      isDeleted: true,
      isDeleteRequested: true,
      deleteRequestedAt: true,
      deleteReason: true,
      createdAt: true,
      updatedAt: true,
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      deleteRequestedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    })
    .paginate()
    .execute();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Customers retrieved successfully',
    ...result,
  });
});

const getCustomerById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      updatedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      deleteRequestedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      receipts: {
        select: {
          id: true,
          receiptNumber: true,
          totalAmount: true,
          paidAmount: true,
          dueAmount: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Customer retrieved successfully',
    data: customer,
  });
});

const updateCustomer = catchAsync(async (req, res) => {
  const { id } = req.params;
  const actor = req.user;
  const payload = req.body;

  const existing = await prisma.customer.findUnique({
    where: { id },
  });

  if (!existing || existing.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  // If phone number is changing, verify it's not taken
  if (payload.phoneNumber && payload.phoneNumber !== existing.phoneNumber) {
    const phoneConflict = await prisma.customer.findUnique({
      where: { phoneNumber: payload.phoneNumber },
    });
    if (phoneConflict) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Another customer with this phone number already exists.',
      );
    }
  }

  const updatedCustomer = await prisma.customer.update({
    where: { id },
    data: {
      ...payload,
      updatedById: actor.id,
    },
  });

  logActivity({
    userId: actor.id,
    action: 'UPDATE_CUSTOMER',
    entityType: 'CUSTOMER',
    entityId: id,
    req,
    details: {
      name: updatedCustomer.name,
      phoneNumber: updatedCustomer.phoneNumber,
      email: updatedCustomer.email,
      address: updatedCustomer.address,
    },
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Customer updated successfully',
    data: updatedCustomer,
  });
});

/**
 * Delete customer handler with multi-role confirmation flow:
 * - Admin/Superadmin: Soft-deletes immediately (isDeleted: true).
 * - Cashier: Submits delete request (isDeleteRequested: true) and alerts admins.
 */
const deleteCustomer = catchAsync(async (req, res) => {
  const { id } = req.params;
  const actor = req.user;
  const { reason } = req.body || {};

  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer || customer.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  const isAdmin = actor.role === UserRoleEnum.SUPERADMIN || actor.role === UserRoleEnum.ADMIN;

  if (isAdmin) {
    // Immediate soft delete by Admin
    const result = await prisma.customer.update({
      where: { id },
      data: {
        isDeleted: true,
        isDeleteRequested: false,
        updatedById: actor.id,
      },
    });

    logActivity({
      userId: actor.id,
      action: 'ADMIN_DELETE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: id,
      req,
      details: { name: customer.name, phoneNumber: customer.phoneNumber },
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Customer deleted successfully',
      data: result,
    });
  } else {
    // Cashier delete request -> Pending Admin Confirmation
    if (customer.isDeleteRequested) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Deletion request is already pending admin confirmation',
      );
    }

    const result = await prisma.customer.update({
      where: { id },
      data: {
        isDeleteRequested: true,
        deleteRequestedById: actor.id,
        deleteRequestedAt: new Date(),
        deleteReason: reason || null,
        updatedById: actor.id,
      },
    });

    logActivity({
      userId: actor.id,
      action: 'REQUEST_DELETE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: id,
      req,
      details: { name: customer.name, reason },
    });

    // Notify all admins about the pending request
    notifyAdmins({
      title: 'Customer Deletion Requested',
      message: `${actor.name || 'Cashier'} requested to delete customer "${customer.name}".`,
      type: NotificationType.WARNING,
      link: '/customers',
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Customer deletion request submitted to admin for confirmation',
      data: result,
    });
  }
});

/**
 * Confirm delete request (Admin only)
 */
const confirmDeleteCustomer = catchAsync(async (req, res) => {
  const { id } = req.params;
  const actor = req.user;

  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer || customer.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  const result = await prisma.customer.update({
    where: { id },
    data: {
      isDeleted: true,
      isDeleteRequested: false,
      updatedById: actor.id,
    },
  });

  logActivity({
    userId: actor.id,
    action: 'ADMIN_CONFIRM_DELETE_CUSTOMER',
    entityType: 'CUSTOMER',
    entityId: id,
    req,
    details: { name: customer.name, requestedBy: customer.deleteRequestedById },
  });

  // Notify the cashier who requested the deletion
  if (customer.deleteRequestedById) {
    sendNotification({
      userId: customer.deleteRequestedById,
      title: 'Customer Deletion Approved',
      message: `Your request to delete "${customer.name}" was approved by administrator.`,
      type: NotificationType.SUCCESS,
      link: '/customers',
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Customer deletion confirmed successfully',
    data: result,
  });
});

/**
 * Reject delete request (Admin only)
 */
const rejectDeleteCustomer = catchAsync(async (req, res) => {
  const { id } = req.params;
  const actor = req.user;

  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer || customer.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  const result = await prisma.customer.update({
    where: { id },
    data: {
      isDeleteRequested: false,
      deleteRequestedById: null,
      deleteRequestedAt: null,
      deleteReason: null,
      updatedById: actor.id,
    },
  });

  logActivity({
    userId: actor.id,
    action: 'ADMIN_REJECT_DELETE_CUSTOMER',
    entityType: 'CUSTOMER',
    entityId: id,
    req,
    details: { name: customer.name, requestedBy: customer.deleteRequestedById },
  });

  if (customer.deleteRequestedById) {
    sendNotification({
      userId: customer.deleteRequestedById,
      title: 'Customer Deletion Rejected',
      message: `Your request to delete "${customer.name}" was rejected by administrator.`,
      type: NotificationType.WARNING,
      link: '/customers',
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Customer deletion request rejected',
    data: result,
  });
});

/**
 * Restore soft-deleted customer (Undo - Admin only)
 */
const restoreCustomer = catchAsync(async (req, res) => {
  const { id } = req.params;
  const actor = req.user;

  const customer = await prisma.customer.findUnique({
    where: { id },
  });

  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }

  if (!customer.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Customer is not deleted');
  }

  const result = await prisma.customer.update({
    where: { id },
    data: {
      isDeleted: false,
      isDeleteRequested: false,
      updatedById: actor.id,
    },
  });

  logActivity({
    userId: actor.id,
    action: 'ADMIN_RESTORE_CUSTOMER',
    entityType: 'CUSTOMER',
    entityId: id,
    req,
    details: { name: customer.name },
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Customer restored successfully',
    data: result,
  });
});

export const CustomerServices = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  confirmDeleteCustomer,
  rejectDeleteCustomer,
  restoreCustomer,
};
