import { Router } from 'express';
import { authenticate, requireAdmin, requireAdminOrWorker } from '../middleware/auth.middleware';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  createUserValidators,
} from '../controllers/users.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Ver usuarios: ADMIN y WORKER
router.get('/', requireAdminOrWorker, listUsers);

// Gestionar usuarios: solo ADMIN
router.post('/', requireAdmin, createUserValidators, createUser);
router.put('/:id', requireAdmin, updateUser);
router.delete('/:id', requireAdmin, deleteUser);
router.put('/:id/password', requireAdmin, changePassword);

export default router;
