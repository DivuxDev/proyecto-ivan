import { Router } from 'express';
import { authenticate, requireAdminOrWorker } from '../middleware/auth.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import {
  uploadPhoto,
  listPhotos,
  getPhoto,
  deletePhoto,
  getPhotosForMap,
} from '../controllers/photos.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Subir foto (solo desde rutas /worker/upload, no desde dashboard)
router.post('/', uploadMiddleware.single('photo'), uploadPhoto);

// Listar fotos (admin y worker ven todas)
router.get('/', requireAdminOrWorker, listPhotos);

// Fotos con coordenadas para el mapa
router.get('/map', requireAdminOrWorker, getPhotosForMap);

// Detalle de una foto
router.get('/:id', requireAdminOrWorker, getPhoto);

// Eliminar foto (admin y worker pueden eliminar cualquier foto)
router.delete('/:id', requireAdminOrWorker, deletePhoto);

export default router;
