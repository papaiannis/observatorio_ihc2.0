import { Router } from 'express';
import {
  createSighting,
  getPendingSightings,
  validateSighting,
  appealSighting,
  getMySightings,
  getSightingsFeed,
  getSightingById,
  deleteSighting
} from '../../controllers/sighting.controller.js';
import { authMiddleware, optionalAuth } from '../middlewares/auth.middleware.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Feed público (opcionalmente autenticado para mostrar u ocultar coordenadas)
router.get('/feed', optionalAuth, getSightingsFeed);

// Avistamientos propios
router.get('/my', authMiddleware, getMySightings);

// Avistamientos pendientes (solo especialistas, validado en controlador)
router.get('/pending', authMiddleware, getPendingSightings);

// Detalle de un avistamiento propio (para la pantalla de seguimiento/tracking)
router.get('/:id', authMiddleware, getSightingById);

// Crear avistamiento
router.post('/', authMiddleware, upload.single('photo'), createSighting);

// Validar avistamiento
router.patch('/:id/validate', authMiddleware, validateSighting);

// Apelar avistamiento
router.patch('/:id/appeal', authMiddleware, appealSighting);

// Eliminar avistamiento
router.delete('/:id', authMiddleware, deleteSighting);

export default router;
