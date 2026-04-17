import 'express-async-errors'; // Manejo automático de errores async
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { UPLOAD_DIR } from './config/storage';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// ─── Seguridad ──────────────────────────────────────────────────────────────

// Headers de seguridad HTTP
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Permitir servir imágenes a otros orígenes
  })
);

// CORS - sólo permitir el origen del frontend
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting general
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas solicitudes, intenta más tarde' },
});
app.use(generalLimiter);

// Rate limiting estricto para autenticación (prevenir fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Demasiados intentos de login, espera 15 minutos' },
});
app.use('/api/auth/login', authLimiter);

// ─── Logging ────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Parseo de body ─────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Archivos estáticos (fotos subidas) ─────────────────────────────────────

app.use('/uploads', express.static(UPLOAD_DIR));

// ─── Health check ────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Rutas API ───────────────────────────────────────────────────────────────

app.use('/api', routes);

// ─── 404 ─────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

// ─── Manejador global de errores ─────────────────────────────────────────────

app.use(errorHandler);

export default app;
