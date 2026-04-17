import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';

/**
 * Error de aplicación con código HTTP
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Manejador global de errores — debe ser el último middleware
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Errores de aplicación conocidos
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  // Errores de Multer (upload)
  if (err instanceof MulterError) {
    const messages: Record<string, string> = {
      LIMIT_FILE_SIZE: `Archivo demasiado grande. Máximo: ${process.env.MAX_FILE_SIZE_MB || 10}MB`,
      LIMIT_FILE_COUNT: 'Demasiados archivos (máximo 5 por vez)',
      LIMIT_UNEXPECTED_FILE: 'Campo de archivo inesperado',
    };
    res.status(400).json({ success: false, error: messages[err.code] || err.message });
    return;
  }

  // Errores de JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, error: 'Token inválido o expirado' });
    return;
  }

  // Errores de validación/tipo de archivo
  if (err.message?.includes('Tipo de archivo no permitido')) {
    res.status(400).json({ success: false, error: err.message });
    return;
  }

  // Log en producción (evitar exponer detalles)
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', err);
  }

  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Error interno del servidor'
        : err.message,
  });
}
