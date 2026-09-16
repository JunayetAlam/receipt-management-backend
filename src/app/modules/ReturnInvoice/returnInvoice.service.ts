import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { prisma } from '../../utils/prisma';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { NotificationType, ReceiptStatus, UserRoleEnum } from '../../../generated/prisma/client';
import { logActivity } from '../../utils/activityLog';
import { notifyAdmins, sendNotification } from '../../utils/notification';
import {
  applyStockDeltaMap,
  deductStockForProductItems,
  restoreStockForProductItems,
  roundToTwo,
} from '../Receipt/receipt.utils';
import { returnInvoiceSearchableFields } from './returnInvoice.constant';
import {
  calculateReturnTotals,
  generateReturnNumber,
  getReturnItemsUniquenessError,
  getReturnedQtyMap,
} from './returnInvoice.utils';

const returnInvoiceInclude = {
  receipt: {
    select: {
      id: true,
      receiptNumber: true,
      customerId: true,
      totalAmount: true,
      paidAmount: true,
      dueAmount: true,
      customer: {
        select: {
          id: true,
          name: true,
          countryCode: true,
          phoneNumber: true,
          email: true,
          address: true,
        },
      },
    },
  },
  items: {
    include: {
      product: {
        select: { id: true, name: true, stock: true, unit: true },
      },
      receiptItem: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          sellingPrice: true,
          discount: true,
          unit: true,
        },
      },
    },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  updatedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  deleteRequestedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} as const;

type ReturnPayloadItem = { receiptItemId: string; quantity: number };

/**
 * Resolve payload items against the source receipt, enforce remaining qty caps,
 * and enrich line fields from the original receipt items.
 */
const enrichReturnItemsFromReceipt = async (
  receiptId: string,
  items: ReturnPayloadItem[],
  excludeReturnInvoiceId?: string,
) => {
  const uniquenessError = getReturnItemsUniquenessError(items);
  if (uniquenessError) {
    throw new AppError(httpStatus.BAD_REQUEST, uniquenessError);
  }

  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: { items: true },
  });

  if (!receipt || receipt.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Source receipt not found or is deleted');
  }

  const receiptItemMap = new Map(receipt.items.map(it => [it.id, it]));
  const returnedMap = await getReturnedQtyMap(prisma, receiptId, excludeReturnInvoiceId);

  const enriched = items.map(it => {
    const source = receiptItemMap.get(it.receiptItemId);
    if (!source) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Receipt item ${it.receiptItemId} does not belong to the selected receipt`,
      );
    }

    const alreadyReturned = returnedMap.get(source.id) || 0;
    const remaining = roundToTwo(source.quantity - alreadyReturned);

    if (remaining <= 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Product "${source.productName}" has no remaining returnable quantity`,
      );
    }

    if (it.quantity > remaining) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Return quantity for "${source.productName}" cannot exceed remaining ${remaining}`,
      );
    }

    return {
      receiptItemId: source.id,
      receiptId: receipt.id,
      productId: source.productId,
      productName: source.productName,
      unit: source.unit,
      sellingPrice: source.sellingPrice,
      quantity: it.quantity,
      discount: source.discount,
    };
  });

  return { receipt, enriched };
};

/**
 * Create a return invoice under a source receipt. Restores product stock.
 */
const createReturnInvoice = catchAsync(async (req, res) => {
  const actor = req.user;
  const {
    receiptId,
    items,
    discount = 0,
    refundedAmount = 0,
    note,
  } = req.body;

  const { receipt, enriched } = await enrichReturnItemsFromReceipt(receiptId, items);

  const {
    calculatedItems,
    subTotal,
    discount: totalDiscount,
    totalAmount,
    refundedAmount: finalRefunded,
    dueRefundAmount,
  } = calculateReturnTotals(enriched, discount, refundedAmount);

  const result = await prisma.$transaction(async tx => {
    const returnNumber = await generateReturnNumber(tx);

    // Returning goods restores inventory
    await restoreStockForProductItems(tx, calculatedItems, []);

    const returnInvoice = await tx.returnInvoice.create({
      data: {
        returnNumber,
        receiptId: receipt.id,
        subTotal,
        discount: totalDiscount,
        totalAmount,
        refundedAmount: finalRefunded,
        dueRefundAmount,
        status: ReceiptStatus.PENDING,
        note: note || null,
        createdById: actor.id,
        updatedById: actor.id,
      },
    });

    await tx.returnInvoiceItem.createMany({
      data: calculatedItems.map(item => ({
        returnInvoiceId: returnInvoice.id,
        receiptId: item.receiptId,
        receiptItemId: item.receiptItemId,
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,
        sellingPrice: item.sellingPrice,
        quantity: item.quantity,
        discount: item.discount,
        totalPrice: item.totalPrice,
      })),
    });

    return tx.returnInvoice.findUnique({
      where: { id: returnInvoice.id },
      include: returnInvoiceInclude,
    });
  });

  logActivity({
    userId: actor.id,
    action: 'CREATE_RETURN_INVOICE',
    entityType: 'RETURN_INVOICE',
    entityId: result?.id,
    req,
    details: {
      returnNumber: result?.returnNumber,
      receiptId: receipt.id,
      receiptNumber: receipt.receiptNumber,
      totalAmount,
      itemCount: calculatedItems.length,
    },
  });

  notifyAdmins({
    title: 'Return Invoice Created',
    message: `Return ${result?.returnNumber} created against Receipt ${receipt.receiptNumber} (৳${totalAmount}).`,
    type: NotificationType.INFO,
    link: `/return-invoices/${result?.id}`,
  });

  sendNotification({
    userId: actor.id,
    title: 'Return Invoice Created',
    message: `Return ${result?.returnNumber} has been generated successfully.`,
    type: NotificationType.SUCCESS,
    link: `/return-invoices/${result?.id}`,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Return invoice created successfully',
    data: { returnInvoice: result },
  });
});

const getAllReturnInvoices = catchAsync(async (req, res) => {
  const actor = req.user;
  const query: Record<string, unknown> = { ...req.query };

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

  const returnsQuery = new QueryBuilder<typeof prisma.returnInvoice>(
    prisma.returnInvoice,
    query,
  );

  const result = await returnsQuery
    .search(returnInvoiceSearchableFields)
    .filter()
    .sort()
    .customFields({
      id: true,
      returnNumber: true,
      receiptId: true,
      subTotal: true,
      discount: true,
      totalAmount: true,
      refundedAmount: true,
      dueRefundAmount: true,
      status: true,
      note: true,
      isDeleted: true,
      isDeleteRequested: true,
      deleteRequestedAt: true,
      deleteReason: true,
      createdAt: true,
      updatedAt: true,
      receipt: {
        select: {
          id: true,
          receiptNumber: true,
          customer: {
            select: {
              id: true,
              name: true,
              countryCode: true,
              phoneNumber: true,
            },
          },
        },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      updatedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      deleteRequestedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      _count: {
        select: { items: true },
      },
    })
    .paginate()
    .execute();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Return invoices retrieved successfully',
    ...result,
  });
});

const getReturnInvoiceById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const returnInvoice = await prisma.returnInvoice.findUnique({
    where: { id },
    include: returnInvoiceInclude,
  });

  if (!returnInvoice) {
    throw new AppError(httpStatus.NOT_FOUND, 'Return invoice not found');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Return invoice retrieved successfully',
    data: returnInvoice,
  });
});

/**
 * Returnable lines for a receipt (original qty, already returned, remaining).
 */
const getReturnableItemsByReceipt = catchAsync(async (req, res) => {
  const { receiptId } = req.params;
  const excludeReturnInvoiceId =
    typeof req.query.excludeReturnInvoiceId === 'string'
      ? req.query.excludeReturnInvoiceId
      : undefined;

  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, stock: true, unit: true },
          },
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          countryCode: true,
          phoneNumber: true,
        },
      },
    },
  });

  if (!receipt || receipt.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Receipt not found or is deleted');
  }

  const returnedMap = await getReturnedQtyMap(
    prisma,
    receiptId,
    excludeReturnInvoiceId,
  );

  const items = receipt.items.map(it => {
    const alreadyReturned = returnedMap.get(it.id) || 0;
    const remainingReturnable = roundToTwo(Math.max(0, it.quantity - alreadyReturned));
    return {
      receiptItemId: it.id,
      productId: it.productId,
      productName: it.productName,
      unit: it.unit,
      sellingPrice: it.sellingPrice,
      discount: it.discount,
      originalQuantity: it.quantity,
      alreadyReturned,
      remainingReturnable,
      product: it.product,
    };
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Returnable receipt items retrieved successfully',
    data: {
      receipt: {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        customer: receipt.customer,
        totalAmount: receipt.totalAmount,
        paidAmount: receipt.paidAmount,
        dueAmount: receipt.dueAmount,
      },
      items,
    },
  });
});

const updateReturnInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const actor = req.user;
  const payload = req.body;

  const existing = await prisma.returnInvoice.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!existing || existing.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Return invoice not found or is deleted');
  }

  if (
    existing.status === ReceiptStatus.APPROVED &&
    actor.role === UserRoleEnum.CASHIER
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Approved return invoices are locked and cannot be edited by cashiers. Please contact an administrator.',
    );
  }

  const warnings: string[] = [];

  const updatedResult = await prisma.$transaction(async tx => {
    let subTotal = existing.subTotal;
    let totalAmount = existing.totalAmount;
    let dueRefundAmount = existing.dueRefundAmount;
    const finalDiscount =
      payload.discount !== undefined ? roundToTwo(payload.discount) : existing.discount;
    let finalRefunded =
      payload.refundedAmount !== undefined
        ? roundToTwo(payload.refundedAmount)
        : existing.refundedAmount;

    if (payload.items && Array.isArray(payload.items)) {
      const { enriched } = await enrichReturnItemsFromReceipt(
        existing.receiptId,
        payload.items,
        existing.id,
      );

      const totals = calculateReturnTotals(enriched, finalDiscount, finalRefunded);
      subTotal = totals.subTotal;
      totalAmount = totals.totalAmount;
      finalRefunded = totals.refundedAmount;
      dueRefundAmount = totals.dueRefundAmount;

      // Stock delta: more returned => restore more; less returned => deduct back
      const oldQtyMap = new Map<string, number>();
      existing.items.forEach(it => {
        if (it.productId) {
          oldQtyMap.set(
            it.productId,
            roundToTwo((oldQtyMap.get(it.productId) || 0) + it.quantity),
          );
        }
      });

      const newQtyMap = new Map<string, number>();
      totals.calculatedItems.forEach(it => {
        if (it.productId) {
          newQtyMap.set(
            it.productId,
            roundToTwo((newQtyMap.get(it.productId) || 0) + it.quantity),
          );
        }
      });

      const stockDeltaMap = new Map<string, number>();
      const allProductIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]);
      for (const productId of allProductIds) {
        const oldQty = oldQtyMap.get(productId) || 0;
        const newQty = newQtyMap.get(productId) || 0;
        const stockDelta = roundToTwo(newQty - oldQty); // positive = more return = restore stock
        if (stockDelta !== 0) {
          stockDeltaMap.set(productId, stockDelta);
        }
      }

      await applyStockDeltaMap(tx, stockDeltaMap, warnings);

      await tx.returnInvoiceItem.deleteMany({ where: { returnInvoiceId: id } });
      await tx.returnInvoiceItem.createMany({
        data: totals.calculatedItems.map(item => ({
          returnInvoiceId: id,
          receiptId: item.receiptId,
          receiptItemId: item.receiptItemId,
          productId: item.productId,
          productName: item.productName,
          unit: item.unit,
          sellingPrice: item.sellingPrice,
          quantity: item.quantity,
          discount: item.discount,
          totalPrice: item.totalPrice,
        })),
      });
    } else if (payload.discount !== undefined || payload.refundedAmount !== undefined) {
      // Recalculate header money from existing items if only money fields change
      const totals = calculateReturnTotals(
        existing.items.map(it => ({
          receiptItemId: it.receiptItemId,
          receiptId: it.receiptId,
          productId: it.productId,
          productName: it.productName,
          unit: it.unit,
          sellingPrice: it.sellingPrice,
          quantity: it.quantity,
          discount: it.discount,
        })),
        finalDiscount,
        finalRefunded,
      );
      subTotal = totals.subTotal;
      totalAmount = totals.totalAmount;
      finalRefunded = totals.refundedAmount;
      dueRefundAmount = totals.dueRefundAmount;
    }

    const statusToSet =
      actor.role === UserRoleEnum.CASHIER
        ? undefined
        : payload.status !== undefined
          ? payload.status
          : undefined;

    return tx.returnInvoice.update({
      where: { id },
      data: {
        subTotal,
        discount: finalDiscount,
        totalAmount,
        refundedAmount: finalRefunded,
        dueRefundAmount,
        note: payload.note !== undefined ? payload.note : undefined,
        ...(statusToSet !== undefined ? { status: statusToSet } : {}),
        updatedById: actor.id,
      },
      include: returnInvoiceInclude,
    });
  });

  logActivity({
    userId: actor.id,
    action: 'UPDATE_RETURN_INVOICE',
    entityType: 'RETURN_INVOICE',
    entityId: id,
    req,
    details: {
      returnNumber: existing.returnNumber,
      totalAmount: updatedResult.totalAmount,
    },
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Return invoice updated successfully',
    data: {
      returnInvoice: updatedResult,
      warnings,
    },
  });
});

const updateReturnInvoiceStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const actor = req.user;
  const { status } = req.body;

  const existing = await prisma.returnInvoice.findUnique({ where: { id } });

  if (!existing || existing.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Return invoice not found or is deleted');
  }

  const updated = await prisma.returnInvoice.update({
    where: { id },
    data: {
      status,
      updatedById: actor.id,
    },
    include: returnInvoiceInclude,
  });

  logActivity({
    userId: actor.id,
    action: status === ReceiptStatus.APPROVED ? 'APPROVE_RETURN_INVOICE' : 'REJECT_RETURN_INVOICE',
    entityType: 'RETURN_INVOICE',
    entityId: id,
    req,
    details: {
      returnNumber: existing.returnNumber,
      oldStatus: existing.status,
      newStatus: status,
    },
  });

  if (existing.createdById && existing.createdById !== actor.id) {
    sendNotification({
      userId: existing.createdById,
      title: `Return Invoice ${status}`,
      message: `Return ${existing.returnNumber} has been ${status.toLowerCase()} by admin.`,
      type: status === ReceiptStatus.APPROVED ? NotificationType.SUCCESS : NotificationType.WARNING,
      link: `/return-invoices/${id}`,
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: `Return invoice status updated to ${status}`,
    data: updated,
  });
});

/**
 * Soft-delete return invoice.
 * Admin: immediate delete and reverse stock (deduct returned qty back out).
 * Cashier: deletion request.
 */
const deleteReturnInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const actor = req.user;
  const { reason } = req.body || {};

  const returnInvoice = await prisma.returnInvoice.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!returnInvoice || returnInvoice.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Return invoice not found');
  }

  const isAdmin =
    actor.role === UserRoleEnum.SUPERADMIN || actor.role === UserRoleEnum.ADMIN;

  if (isAdmin) {
    const warnings: string[] = [];
    const result = await prisma.$transaction(async tx => {
      await deductStockForProductItems(tx, returnInvoice.items, warnings);
      return tx.returnInvoice.update({
        where: { id },
        data: {
          isDeleted: true,
          isDeleteRequested: false,
          updatedById: actor.id,
        },
      });
    });

    logActivity({
      userId: actor.id,
      action: 'ADMIN_DELETE_RETURN_INVOICE',
      entityType: 'RETURN_INVOICE',
      entityId: id,
      req,
      details: {
        returnNumber: returnInvoice.returnNumber,
        totalAmount: returnInvoice.totalAmount,
      },
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Return invoice deleted successfully and inventory has been adjusted',
      data: { returnInvoice: result, warnings },
    });
  } else {
    if (returnInvoice.isDeleteRequested) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Deletion request is already pending admin confirmation',
      );
    }

    const result = await prisma.returnInvoice.update({
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
      action: 'REQUEST_DELETE_RETURN_INVOICE',
      entityType: 'RETURN_INVOICE',
      entityId: id,
      req,
      details: { returnNumber: returnInvoice.returnNumber, reason },
    });

    notifyAdmins({
      title: 'Return Invoice Deletion Requested',
      message: `${actor.name || 'Cashier'} requested deletion of Return ${returnInvoice.returnNumber}.`,
      type: NotificationType.WARNING,
      link: `/return-invoices/${id}`,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: 'Return invoice deletion request submitted to admin for confirmation',
      data: result,
    });
  }
});

const confirmDeleteReturnInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const actor = req.user;

  const returnInvoice = await prisma.returnInvoice.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!returnInvoice || returnInvoice.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Return invoice not found');
  }

  const warnings: string[] = [];
  const result = await prisma.$transaction(async tx => {
    await deductStockForProductItems(tx, returnInvoice.items, warnings);
    return tx.returnInvoice.update({
      where: { id },
      data: {
        isDeleted: true,
        isDeleteRequested: false,
        updatedById: actor.id,
      },
    });
  });

  logActivity({
    userId: actor.id,
    action: 'ADMIN_CONFIRM_DELETE_RETURN_INVOICE',
    entityType: 'RETURN_INVOICE',
    entityId: id,
    req,
    details: { returnNumber: returnInvoice.returnNumber },
  });

  if (returnInvoice.deleteRequestedById) {
    sendNotification({
      userId: returnInvoice.deleteRequestedById,
      title: 'Return Invoice Deletion Confirmed',
      message: `Admin confirmed deletion for Return ${returnInvoice.returnNumber}.`,
      type: NotificationType.SUCCESS,
      link: `/return-invoices`,
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Return invoice deletion confirmed and inventory adjusted',
    data: { returnInvoice: result, warnings },
  });
});

const rejectDeleteReturnInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const actor = req.user;

  const returnInvoice = await prisma.returnInvoice.findUnique({ where: { id } });

  if (!returnInvoice || returnInvoice.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Return invoice not found');
  }

  const result = await prisma.returnInvoice.update({
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
    action: 'ADMIN_REJECT_DELETE_RETURN_INVOICE',
    entityType: 'RETURN_INVOICE',
    entityId: id,
    req,
    details: { returnNumber: returnInvoice.returnNumber },
  });

  if (returnInvoice.deleteRequestedById) {
    sendNotification({
      userId: returnInvoice.deleteRequestedById,
      title: 'Return Invoice Deletion Rejected',
      message: `Admin rejected deletion request for Return ${returnInvoice.returnNumber}.`,
      type: NotificationType.WARNING,
      link: `/return-invoices/${id}`,
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Return invoice deletion request rejected',
    data: result,
  });
});

/**
 * Restore soft-deleted return invoice and re-apply stock restore.
 */
const restoreReturnInvoice = catchAsync(async (req, res) => {
  const { id } = req.params;
  const actor = req.user;

  const returnInvoice = await prisma.returnInvoice.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!returnInvoice || !returnInvoice.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Return invoice is not in deleted state');
  }

  // Ensure restoring would not exceed original receipt quantities
  const { enriched } = await enrichReturnItemsFromReceipt(
    returnInvoice.receiptId,
    returnInvoice.items.map(it => ({
      receiptItemId: it.receiptItemId,
      quantity: it.quantity,
    })),
  );

  const result = await prisma.$transaction(async tx => {
    await restoreStockForProductItems(tx, enriched, []);

    return tx.returnInvoice.update({
      where: { id },
      data: {
        isDeleted: false,
        isDeleteRequested: false,
        deleteRequestedById: null,
        deleteRequestedAt: null,
        deleteReason: null,
        updatedById: actor.id,
      },
      include: returnInvoiceInclude,
    });
  });

  logActivity({
    userId: actor.id,
    action: 'ADMIN_RESTORE_RETURN_INVOICE',
    entityType: 'RETURN_INVOICE',
    entityId: id,
    req,
    details: { returnNumber: returnInvoice.returnNumber },
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Return invoice restored successfully',
    data: { returnInvoice: result },
  });
});

export const ReturnInvoiceServices = {
  createReturnInvoice,
  getAllReturnInvoices,
  getReturnInvoiceById,
  getReturnableItemsByReceipt,
  updateReturnInvoice,
  updateReturnInvoiceStatus,
  deleteReturnInvoice,
  confirmDeleteReturnInvoice,
  rejectDeleteReturnInvoice,
  restoreReturnInvoice,
};
