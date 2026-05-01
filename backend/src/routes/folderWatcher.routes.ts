import { Router } from 'express';
import { getStatus, triggerSync } from '../controllers/folderWatcher.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Solo admins pueden ver el estado del folder watcher
router.get('/status', authenticate, requireAdmin, getStatus);

// Solo admins pueden disparar sincronización manual
router.post('/trigger', authenticate, requireAdmin, triggerSync);

export default router;
