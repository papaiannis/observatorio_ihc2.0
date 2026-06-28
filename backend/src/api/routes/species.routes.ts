import { Router } from 'express';
import { searchSpeciesController } from '../../controllers/species.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/species/search?q=<término>
// Solo accesible por Especialistas durante el flujo de curaduría
router.get('/search', authMiddleware, searchSpeciesController);

export default router;
