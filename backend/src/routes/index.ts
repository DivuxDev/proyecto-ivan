import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './users.routes';
import photoRoutes from './photos.routes';
import statsRoutes from './stats.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/photos', photoRoutes);
router.use('/stats', statsRoutes);

export default router;
