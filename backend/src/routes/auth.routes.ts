import { Router } from 'express';
import {
  login,
  register,
  getMe,
  loginValidators,
  registerValidators,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', loginValidators, login);
router.post('/register', registerValidators, register);
router.get('/me', authenticate, getMe);

export default router;
