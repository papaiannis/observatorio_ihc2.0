import { Router } from 'express';
import { getProfile, updateProfile } from '../../controllers/profile.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// IMPORTANTE: '/me' debe registrarse ANTES de '/:username' para que Express
// no interprete la cadena "me" como un username.
router.patch('/me', authMiddleware, updateProfile);
router.get('/:username', getProfile);  // público

export default router;
