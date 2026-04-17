import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  createUserValidators,
} from '../controllers/users.controller';

const router = Router();

// Todas las rutas de usuarios requieren autenticación + rol admin
router.use(authenticate, requireAdmin);

router.get('/', listUsers);
router.post('/', createUserValidators, createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/password', changePassword);

export default router;
