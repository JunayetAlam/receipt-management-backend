/**
 * Round a number to two decimal places safely avoiding floating point artifacts
 */
export const roundToTwo = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Generate unique, chronological receipt number: REC-YYYYMMDD-XXXX
 */
export const generateReceiptNumber = async (prismaClient: any): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `REC-${dateStr}-`;

  const latestReceipt = await prismaClient.receipt.findFirst({
    where: {
      receiptNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      receiptNumber: 'desc',
    },
    select: {
      receiptNumber: true,
    },
  });

  let nextSeq = 1;
  if (latestReceipt?.receiptNumber) {
    const parts = latestReceipt.receiptNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
};

export interface CalculatedItem {
  productId?: string | null;
  productName: string;
  unit: any;
  sellingPrice: number;
  buyingPrice?: number | null;
  quantity: number;
  discount: number; // percentage e.g. 2.5
  totalPrice: number;
}

export interface CalculatedReceiptTotals {
  calculatedItems: CalculatedItem[];
  subTotal: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
}

/**
 * Calculate individual item discounts (percentage) and overall receipt totals
 */
export const calculateReceiptTotals = (
  rawItems: {
    productId?: string | null;
    productName: string;
    unit?: any;
    sellingPrice: number;
    buyingPrice?: number | null;
    quantity: number;
    discount?: number;
  }[],
  overallDiscount = 0,
  paidAmount = 0,
): CalculatedReceiptTotals => {
  let subTotal = 0;

  const calculatedItems: CalculatedItem[] = rawItems.map(item => {
    const qty = Number(item.quantity);
    const unitPrice = Number(item.sellingPrice);
    const itemSubtotal = roundToTwo(qty * unitPrice);

    const discountPercent = Math.max(0, Math.min(100, Number(item.discount) || 0));
    const itemDiscountAmount = roundToTwo((itemSubtotal * discountPercent) / 100);
    const itemTotalPrice = roundToTwo(Math.max(0, itemSubtotal - itemDiscountAmount));

    subTotal = roundToTwo(subTotal + itemTotalPrice);

    return {
      productId: item.productId || null,
      productName: item.productName.trim(),
      unit: item.unit || 'PIECE',
      sellingPrice: unitPrice,
      buyingPrice: item.buyingPrice ?? null,
      quantity: qty,
      discount: discountPercent,
      totalPrice: itemTotalPrice,
    };
  });

  const finalDiscount = roundToTwo(Math.max(0, Number(overallDiscount) || 0));
  const totalAmount = roundToTwo(Math.max(0, subTotal - finalDiscount));
  const finalPaid = roundToTwo(Math.max(0, Number(paidAmount) || 0));
  const dueAmount = roundToTwo(Math.max(0, totalAmount - finalPaid));

  return {
    calculatedItems,
    subTotal,
    discount: finalDiscount,
    totalAmount,
    paidAmount: finalPaid,
    dueAmount,
  };
};
