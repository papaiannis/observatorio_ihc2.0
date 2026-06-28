import { createAuthenticatedClient } from '../infrastructure/supabase.js';
import { AppError } from '../infrastructure/AppError.js';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  sighting_id: string | null;
  is_read: boolean | null;
  created_at: string;
}

/**
 * Obtiene las notificaciones del usuario autenticado,
 * ordenadas de más reciente a más antigua.
 * @param userToken - JWT del usuario para acceso RLS correcto
 */
export const getUserNotifications = async (userToken: string): Promise<Notification[]> => {
  const authClient = createAuthenticatedClient(userToken);

  const { data, error } = await authClient
    .from('notifications')
    .select('id, user_id, title, message, sighting_id, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new AppError(`Error al obtener notificaciones: ${error.message}`, 500);
  }

  return (data ?? []) as Notification[];
};

/**
 * Marca una notificación como leída.
 * La política RLS garantiza que el usuario solo pueda marcar las suyas.
 * @param notificationId - UUID de la notificación
 * @param userToken - JWT del usuario para acceso RLS correcto
 */
export const markNotificationRead = async (
  notificationId: string,
  userToken: string,
): Promise<{ id: string }> => {
  const authClient = createAuthenticatedClient(userToken);

  const { data, error } = await authClient
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select('id')
    .single();

  if (error) {
    throw new AppError(`Error al actualizar notificación: ${error.message}`, 500);
  }

  if (!data) {
    throw new AppError('Notificación no encontrada o no pertenece al usuario.', 404);
  }

  return data as { id: string };
};
