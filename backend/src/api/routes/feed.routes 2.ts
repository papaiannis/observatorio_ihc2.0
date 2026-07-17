import { Router } from 'express';
import { getFeedController, getObservatoryController } from '../../controllers/feed.controller.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/feed — Feed comunitario completo
// optionalAuth: usuarios autenticados ven coordenadas; invitados ven null en lat/lng
router.get('/', optionalAuth, getFeedController);

// GET /api/feed/observatory — Solo avistamientos validados (Observatorio científico)
router.get('/observatory', optionalAuth, getObservatoryController);

export default router;
