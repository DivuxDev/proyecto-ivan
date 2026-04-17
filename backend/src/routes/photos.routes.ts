import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
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

// Subir foto (trabajador o admin)
router.post('/', uploadMiddleware.single('photo'), uploadPhoto);

// Listar fotos (admin ve todas, worker sólo las suyas)
router.get('/', listPhotos);

// Fotos con coordenadas para el mapa
router.get('/map', getPhotosForMap);

// Detalle de una foto
router.get('/:id', getPhoto);

// Eliminar foto (sólo admin)
router.delete('/:id', requireAdmin, deletePhoto);

export default router;
