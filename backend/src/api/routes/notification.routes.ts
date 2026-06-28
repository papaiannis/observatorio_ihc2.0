import { Router } from 'express';
import {
  getNotificationsController,
  markNotificationReadController,
} from '../../controllers/notification.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/notifications — Lista de notificaciones del usuario autenticado
router.get('/', authMiddleware, getNotificationsController);

// PATCH /api/notifications/:id/read — Marcar notificación como leída
router.patch('/:id/read', authMiddleware, markNotificationReadController);

export default router;
