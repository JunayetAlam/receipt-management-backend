import {
  NotificationTargetType,
  NotificationType,
} from '../../generated/prisma/client';
import { prisma } from './prisma';

export interface SendNotificationPayload {
  userId?: string | null;
  title: string;
  message: string;
  type?: NotificationType;
  targetType?: NotificationTargetType;
  link?: string | null;
}

export interface BroadcastNotificationPayload {
  title: string;
  message: string;
  type?: NotificationType;
  link?: string | null;
}

/**
 * Utility function to send notification to a single specific user in a non-blocking (fire-and-forget) manner.
 */
export const sendNotification = (payload: SendNotificationPayload): void => {
  prisma.notification
    .create({
      data: {
        userId: payload.userId || null,
        title: payload.title,
        message: payload.message,
        type: payload.type || NotificationType.INFO,
        targetType: payload.targetType || (payload.userId ? NotificationTargetType.SPECIFIC_USER : NotificationTargetType.ALL),
        link: payload.link || null,
      },
    })
    .catch(err => {
      console.error('[Notification Service Error]:', err);
    });
};

/**
 * Utility function to broadcast notification to all Admins and Superadmins (creates 1 single notification row).
 */
export const notifyAdmins = (payload: BroadcastNotificationPayload): void => {
  prisma.notification
    .create({
      data: {
        title: payload.title,
        message: payload.message,
        type: payload.type || NotificationType.INFO,
        targetType: NotificationTargetType.ADMINS,
        link: payload.link || null,
      },
    })
    .catch(err => {
      console.error('[Admin Broadcast Notification Error]:', err);
    });
};

/**
 * Utility function to broadcast notification to all Cashiers (creates 1 single notification row).
 */
export const notifyCashiers = (payload: BroadcastNotificationPayload): void => {
  prisma.notification
    .create({
      data: {
        title: payload.title,
        message: payload.message,
        type: payload.type || NotificationType.INFO,
        targetType: NotificationTargetType.CASHIERS,
        link: payload.link || null,
      },
    })
    .catch(err => {
      console.error('[Cashier Broadcast Notification Error]:', err);
    });
};

/**
 * Utility function to broadcast notification to ALL users in the system (creates 1 single notification row).
 */
export const notifyAll = (payload: BroadcastNotificationPayload): void => {
  prisma.notification
    .create({
      data: {
        title: payload.title,
        message: payload.message,
        type: payload.type || NotificationType.INFO,
        targetType: NotificationTargetType.ALL,
        link: payload.link || null,
      },
    })
    .catch(err => {
      console.error('[Global Broadcast Notification Error]:', err);
    });
};
