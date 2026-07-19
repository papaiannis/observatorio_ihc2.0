import { Request, Response, NextFunction } from 'express';
import {
  getUserNotifications,
  markNotificationRead,
  registerPushToken,
} from '../services/notification.service.js';
import { AppError } from '../infrastructure/AppError.js';

/**
 * GET /api/notifications
 * Lista las notificaciones del usuario autenticado (máximo 50, más recientes primero).
 */
export const getNotificationsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) throw new AppError('No autorizado', 401);
    if (!user.token) throw new AppError('Token requerido', 401);

    const notifications = await getUserNotifications(user.token);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    res.json({
      unread_count: unreadCount,
      total: notifications.length,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Marca una notificación específica como leída.
 * La política RLS garantiza que el usuario solo afecte sus propias notificaciones.
 */
export const markNotificationReadController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) throw new AppError('No autorizado', 401);
    if (!user.token) throw new AppError('Token requerido', 401);

    const { id } = req.params;

    const updated = await markNotificationRead(id as string, user.token);

    res.json({ message: 'Notificación marcada como leída.', notification: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * POST or PATCH /api/notifications/push-token
 * Registra o actualiza el token de notificaciones push del dispositivo para el usuario autenticado.
 */
export const registerPushTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.token) throw new AppError('No autorizado', 401);

    const { push_token } = req.body;
    if (!push_token || typeof push_token !== 'string') {
      throw new AppError('push_token es requerido y debe ser un string válido', 400);
    }

    await registerPushToken(user.id, user.token, push_token);
    res.json({ success: true, message: 'Token registrado exitosamente.' });
  } catch (error) {
    next(error);
  }
};
