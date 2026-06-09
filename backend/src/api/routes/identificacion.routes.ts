import { Router } from 'express';
import { identificarAnimalController } from '../../controllers/identificacion.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @route POST /api/v1/identificacion/identificar
 * @description Inicia el procesamiento de IA de un avistamiento a partir de su ID y photo_url
 * @body { sighting_id: string, photo_url: string }
 */
router.post('/identificar', authMiddleware, identificarAnimalController);

export default router;
