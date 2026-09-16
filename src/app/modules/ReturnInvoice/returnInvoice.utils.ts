import { roundToTwo } from '../Receipt/receipt.utils';

const DUPLICATE_RECEIPT_ITEM_MESSAGE =
  'Duplicate receipt item on return invoice; each source line can only appear once';

export const getDuplicateReturnItemMessage = () => DUPLICATE_RECEIPT_ITEM_MESSAGE;

/**
 * Generate unique return invoice number: RET-YYYYMMDD-XXXX
 */
export const generateReturnNumber = async (prismaClient: any): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `RET-${dateStr}-`;

  const latest = await prismaClient.returnInvoice.findFirst({
    where: {
      returnNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      returnNumber: 'desc',
    },
    select: {
      returnNumber: true,
    },
  });

  let nextSeq = 1;
  if (latest?.returnNumber) {
    const parts = latest.returnNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

export const getReturnItemsUniquenessError = (
  items: { receiptItemId: string }[],
): string | null => {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.receiptItemId)) {
      return DUPLICATE_RECEIPT_ITEM_MESSAGE;
    }
    seen.add(item.receiptItemId);
  }
  return null;
};

export interface CalculatedReturnItem {
  receiptItemId: string;
  receiptId: string;
  productId: string | null;
  productName: string;
  unit: any;
  sellingPrice: number;
  quantity: number;
  discount: number;
  totalPrice: number;
}

export interface CalculatedReturnTotals {
  calculatedItems: CalculatedReturnItem[];
  subTotal: number;
  discount: number;
  totalAmount: number;
  refundedAmount: number;
  dueRefundAmount: number;
}

/**
 * Calculate return line totals (item discount is percentage) and header money fields.
 */
export const calculateReturnTotals = (
  rawItems: {
    receiptItemId: string;
    receiptId: string;
    productId?: string | null;
    productName: string;
    unit?: any;
    sellingPrice: number;
    quantity: number;
    discount?: number;
  }[],
  overallDiscount = 0,
  refundedAmount = 0,
): CalculatedReturnTotals => {
  let subTotal = 0;

  const calculatedItems: CalculatedReturnItem[] = rawItems.map(item => {
    const qty = Number(item.quantity);
    const unitPrice = Number(item.sellingPrice);
    const itemSubtotal = roundToTwo(qty * unitPrice);

    const discountPercent = Math.max(0, Math.min(100, Number(item.discount) || 0));
    const itemDiscountAmount = roundToTwo((itemSubtotal * discountPercent) / 100);
    const itemTotalPrice = roundToTwo(Math.max(0, itemSubtotal - itemDiscountAmount));

    subTotal = roundToTwo(subTotal + itemTotalPrice);

    return {
      receiptItemId: item.receiptItemId,
      receiptId: item.receiptId,
      productId: item.productId || null,
      productName: item.productName.trim(),
      unit: item.unit || 'PIECE',
      sellingPrice: unitPrice,
      quantity: qty,
      discount: discountPercent,
      totalPrice: itemTotalPrice,
    };
  });

  const finalDiscount = roundToTwo(Math.max(0, Number(overallDiscount) || 0));
  const totalAmount = roundToTwo(Math.max(0, subTotal - finalDiscount));
  const finalRefunded = roundToTwo(Math.max(0, Number(refundedAmount) || 0));
  const dueRefundAmount = roundToTwo(Math.max(0, totalAmount - finalRefunded));

  return {
    calculatedItems,
    subTotal,
    discount: finalDiscount,
    totalAmount,
    refundedAmount: finalRefunded,
    dueRefundAmount,
  };
};

/**
 * Aggregate already-returned quantities per receiptItemId for a receipt.
 * Soft-deleted return invoices are excluded. Optionally exclude one return invoice (for edits).
 */
export const getReturnedQtyMap = async (
  prismaClient: any,
  receiptId: string,
  excludeReturnInvoiceId?: string,
): Promise<Map<string, number>> => {
  const rows = await prismaClient.returnInvoiceItem.findMany({
    where: {
      receiptId,
      returnInvoice: {
        isDeleted: false,
        ...(excludeReturnInvoiceId ? { id: { not: excludeReturnInvoiceId } } : {}),
      },
    },
    select: {
      receiptItemId: true,
      quantity: true,
    },
  });

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(
      row.receiptItemId,
      roundToTwo((map.get(row.receiptItemId) || 0) + row.quantity),
    );
  }
  return map;
};
