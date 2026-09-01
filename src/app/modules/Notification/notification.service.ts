import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { prisma } from '../../utils/prisma';
import AppError from '../../errors/AppError';
import { NotificationTargetType } from '../../../generated/prisma/client';

const getUserTargetConditions = (userId: string, role: string) => {
  const isSuperOrAdmin = role === 'SUPERADMIN' || role === 'ADMIN';
  const conditions: Array<Record<string, unknown>> = [
    { userId },
    { targetType: NotificationTargetType.ALL },
  ];

  if (isSuperOrAdmin) {
    conditions.push({ targetType: NotificationTargetType.ADMINS });
  }
  if (role === 'CASHIER') {
    conditions.push({ targetType: NotificationTargetType.CASHIERS });
  }

  return conditions;
};

const getMyNotifications = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const targetConditions = getUserTargetConditions(userId, userRole);
  const whereCondition = {
    OR: targetConditions,
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: whereCondition,
      include: {
        reads: {
          where: { userId },
          select: { readAt: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.notification.count({
      where: whereCondition,
    }),
  ]);

  const formattedNotifications = notifications.map(notif => {
    const isRead = notif.reads.length > 0;
    const readAt = notif.reads[0]?.readAt || null;
    const { reads: _reads, ...rest } = notif;
    return {
      ...rest,
      isRead,
      readAt,
    };
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Notifications retrieved successfully',
    data: formattedNotifications,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  });
});

const getUnreadNotificationCount = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const targetConditions = getUserTargetConditions(userId, userRole);

  const count = await prisma.notification.count({
    where: {
      OR: targetConditions,
      reads: {
        none: {
          userId,
        },
      },
    },
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Unread notification count retrieved successfully',
    data: { unreadCount: count },
  });
});

const markAsRead = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { id } = req.params;

  const targetConditions = getUserTargetConditions(userId, userRole);
  const notification = await prisma.notification.findFirst({
    where: {
      id,
      OR: targetConditions,
    },
  });

  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  const readRecord = await prisma.notificationRead.upsert({
    where: {
      notificationId_userId: {
        notificationId: id,
        userId,
      },
    },
    create: {
      notificationId: id,
      userId,
      readAt: new Date(),
    },
    update: {
      readAt: new Date(),
    },
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Notification marked as read',
    data: {
      notificationId: id,
      readAt: readRecord.readAt,
      isRead: true,
    },
  });
});

const markAllAsRead = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const targetConditions = getUserTargetConditions(userId, userRole);

  const unreadNotifications = await prisma.notification.findMany({
    where: {
      OR: targetConditions,
      reads: {
        none: {
          userId,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (unreadNotifications.length > 0) {
    await prisma.notificationRead.createMany({
      data: unreadNotifications.map(n => ({
        notificationId: n.id,
        userId,
        readAt: new Date(),
      })),
      skipDuplicates: true,
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'All notifications marked as read',
    data: { markedCount: unreadNotifications.length },
  });
});

const deleteNotification = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { id } = req.params;

  const targetConditions = getUserTargetConditions(userId, userRole);
  const notification = await prisma.notification.findFirst({
    where: {
      id,
      OR: targetConditions,
    },
  });

  if (!notification) {
    throw new AppError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  // If specific user notification, delete it; otherwise mark as read
  if (notification.userId === userId) {
    await prisma.notification.delete({
      where: { id },
    });
  } else {
    await prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId: id,
          userId,
        },
      },
      create: {
        notificationId: id,
        userId,
      },
      update: {},
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Notification removed successfully',
    data: null,
  });
});

export const NotificationServices = {
  getMyNotifications,
  getUnreadNotificationCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
