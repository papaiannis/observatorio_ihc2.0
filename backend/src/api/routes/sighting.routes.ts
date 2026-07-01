import { Router } from 'express';
import { 
  createSighting, 
  getPendingSightings, 
  validateSighting, 
  appealSighting, 
  getMySightings, 
  getSightingsFeed 
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

// Crear avistamiento
router.post('/', authMiddleware, upload.single('photo'), createSighting);

// Validar avistamiento
router.patch('/:id/validate', authMiddleware, validateSighting);

// Apelar avistamiento
router.patch('/:id/appeal', authMiddleware, appealSighting);

export default router;
