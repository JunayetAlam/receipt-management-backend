import express from 'express';
import auth from '../../middlewares/auth';
import { NotificationServices } from './notification.service';

const router = express.Router();

router.get('/my-notifications', auth('ANY'), NotificationServices.getMyNotifications);
router.get('/unread-count', auth('ANY'), NotificationServices.getUnreadNotificationCount);
router.patch('/mark-all-read', auth('ANY'), NotificationServices.markAllAsRead);
router.patch('/:id/read', auth('ANY'), NotificationServices.markAsRead);
router.delete('/:id', auth('ANY'), NotificationServices.deleteNotification);

export const NotificationRouters = router;
