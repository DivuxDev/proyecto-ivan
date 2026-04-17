import { Response, NextFunction } from 'express';
import { verifyToken } from '../config/jwt';
import { AuthRequest } from '../types';

/**
 * Middleware: verifica JWT en header Authorization o cookie
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({ success: false, error: 'Se requiere autenticación' });
      return;
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token inválido o expirado' });
  }
}

/**
 * Middleware: sólo administradores
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: 'Acceso restringido a administradores' });
    return;
  }
  next();
}

/**
 * Middleware: permite acceso al propio usuario o a administradores
 */
export function requireSelfOrAdmin(userIdParam = 'id') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const targetId = req.params[userIdParam];
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Se requiere autenticación' });
      return;
    }
    if (req.user.role !== 'ADMIN' && req.user.userId !== targetId) {
      res.status(403).json({ success: false, error: 'Acceso denegado' });
      return;
    }
    next();
  };
}
