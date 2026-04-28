import { Router } from 'express';
import { getStatus } from '../controllers/folderWatcher.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Solo admins pueden ver el estado del folder watcher
router.get('/status', authenticate, requireAdmin, getStatus);

export default router;
