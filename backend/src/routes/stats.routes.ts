import { Router } from 'express';
import { authenticate, requireAdminOrWorker } from '../middleware/auth.middleware';
import {
  getOverview,
  getActivity,
  getWorkerStats,
  exportData,
} from '../controllers/stats.controller';

const router = Router();

// Estadísticas para admin y worker
router.use(authenticate, requireAdminOrWorker);

router.get('/overview', getOverview);
router.get('/activity', getActivity);
router.get('/workers', getWorkerStats);
router.get('/export', exportData);

export default router;
