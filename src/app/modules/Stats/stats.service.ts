import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { prisma } from '../../utils/prisma';
import { roundToTwo } from '../Receipt/receipt.utils';
import { sumCustomersSignedDue } from '../Customer/customer.utils';

/**
 * Active-customer stats: count + signed live due (receipts + last return settlement).
 */
const getCustomerStats = catchAsync(async (_req, res) => {
  const customers = await prisma.customer.findMany({
    where: { isDeleted: false },
    select: { id: true },
  });

  const totalCustomers = customers.length;
  const totalDue = roundToTwo(
    await sumCustomersSignedDue(
      prisma,
      customers.map(customer => customer.id),
    ),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Customer stats retrieved successfully',
    data: {
      totalCustomers,
      totalDue,
    },
  });
});

export const StatsServices = {
  getCustomerStats,
};
