import express from 'express';
import auth from '../../middlewares/auth';
import { ActivityLogServices } from './activityLog.service';

const router = express.Router();

router.get('/', auth('SUPERADMIN', 'ADMIN'), ActivityLogServices.getAllActivityLogs);
router.get('/my-logs', auth('ANY'), ActivityLogServices.getMyActivityLogs);

export const ActivityLogRouters = router;
