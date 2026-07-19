import { Router } from 'express';
import { getProfile, updateProfile } from '../../controllers/profile.controller.js';
import { registerPushTokenController } from '../../controllers/notification.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();


// IMPORTANTE: '/me' debe registrarse ANTES de '/:username' para que Express
// no interprete la cadena "me" como un username.
/**
 * PATCH /profiles/me
 * Actualiza el perfil propio. Solo campos permitidos: avatar_url, preferencias.
 */
router.patch('/me', authMiddleware, upload.single('avatar'), updateProfile);
router.patch('/push-token', authMiddleware, registerPushTokenController);
router.post('/push-token', authMiddleware, registerPushTokenController);
router.get('/:username', getProfile);  // público

export default router;
