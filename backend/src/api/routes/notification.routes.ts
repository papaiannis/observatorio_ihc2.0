import { Router } from 'express';
import {
  getNotificationsController,
  markNotificationReadController,
  registerPushTokenController,
} from '../../controllers/notification.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/notifications — Lista de notificaciones del usuario autenticado
router.get('/', authMiddleware, getNotificationsController);

// PATCH /api/notifications/:id/read — Marcar notificación como leída
router.patch('/:id/read', authMiddleware, markNotificationReadController);

// POST & PATCH /api/notifications/push-token — Registrar token de push
router.post('/push-token', authMiddleware, registerPushTokenController);
router.patch('/push-token', authMiddleware, registerPushTokenController);

export default router;
