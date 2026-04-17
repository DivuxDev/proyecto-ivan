import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import {
  getOverview,
  getActivity,
  getWorkerStats,
  exportData,
} from '../controllers/stats.controller';

const router = Router();

// Estadísticas sólo para admin
router.use(authenticate, requireAdmin);

router.get('/overview', getOverview);
router.get('/activity', getActivity);
router.get('/workers', getWorkerStats);
router.get('/export', exportData);

export default router;
