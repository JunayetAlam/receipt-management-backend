import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { prisma } from '../../utils/prisma';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { UserRoleEnum } from '../../../generated/prisma/client';

const getAllActivityLogs = catchAsync(async (req, res) => {
  const actor = req.user;
  const query: Record<string, unknown> = { ...req.query };

  // Role-based visibility logic
  if (actor.role === UserRoleEnum.CASHIER) {
    throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to view global activity logs');
  }

  if (actor.role === UserRoleEnum.ADMIN) {
    // Admin can see Cashier logs and their own logs
    if (query.userId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: String(query.userId) },
        select: { id: true, role: true },
      });

      if (!targetUser || (targetUser.id !== actor.id && targetUser.role !== UserRoleEnum.CASHIER)) {
        // Not allowed to inspect other admins/superadmins
        sendResponse(res, {
          statusCode: httpStatus.OK,
          message: 'Activity logs retrieved successfully',
          data: [],
          meta: {
            page: Number(query.page) || 1,
            limit: Number(query.limit) || 25,
            total: 0,
            totalPage: 0,
          },
        });
        return;
      }
    } else {
      // Apply OR condition: logs from CASHIER users OR actor itself
      query['OR'] = [
        { userId: actor.id },
        { user: { role: UserRoleEnum.CASHIER } },
      ];
    }
  }

  // Default limit 25 per page if not specified
  if (!query.limit) {
    query.limit = 25;
  }

  const logsQuery = new QueryBuilder<typeof prisma.activityLog>(
    prisma.activityLog,
    query,
  );

  const result = await logsQuery
    .search(['action', 'entityType', 'ipAddress'])
    .filter()
    .sort()
    .customFields({
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      details: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          profilePhoto: true,
        },
      },
    })
    .paginate()
    .execute();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Activity logs retrieved successfully',
    ...result,
  });
});

const getMyActivityLogs = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const query: Record<string, unknown> = { ...req.query, userId };

  if (!query.limit) {
    query.limit = 25;
  }

  const logsQuery = new QueryBuilder<typeof prisma.activityLog>(
    prisma.activityLog,
    query,
  );

  const result = await logsQuery
    .search(['action', 'entityType', 'ipAddress'])
    .filter()
    .sort()
    .customFields({
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      details: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          profilePhoto: true,
        },
      },
    })
    .paginate()
    .execute();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User activity logs retrieved successfully',
    ...result,
  });
});

export const ActivityLogServices = {
  getAllActivityLogs,
  getMyActivityLogs,
};
