import express from 'express';
import auth from '../../middlewares/auth';
import { StatsServices } from './stats.service';

const router = express.Router();

router.get('/customers', auth('ANY'), StatsServices.getCustomerStats);

export const StatsRouters = router;
