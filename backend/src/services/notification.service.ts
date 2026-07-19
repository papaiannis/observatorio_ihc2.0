import { supabase, createAuthenticatedClient } from '../infrastructure/supabase.js';
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
 * Registra o actualiza el push token del usuario autenticado en sus preferencias y perfil.
 */
export const registerPushToken = async (userId: string, userToken: string, pushToken: string): Promise<void> => {
  const authClient = createAuthenticatedClient(userToken);
  const { data: profile } = await authClient
    .from('profiles')
    .select('preferencias')
    .eq('id', userId)
    .maybeSingle();

  const currentPrefs = (profile?.preferencias as Record<string, any>) || {};
  const updatedPrefs = { ...currentPrefs, push_token: pushToken };

  try {
    await authClient
      .from('profiles')
      .update({ push_token: pushToken, preferencias: updatedPrefs })
      .eq('id', userId);
  } catch (e) {
    await authClient
      .from('profiles')
      .update({ preferencias: updatedPrefs })
      .eq('id', userId);
  }
};

/**
 * Dispara una notificación en la base de datos y envía notificación push de Expo al dispositivo.
 */
export const sendPushAndCreateNotification = async (
  userId: string,
  title: string,
  message: string,
  sightingId?: string | null,
  contributionId?: string | null,
): Promise<void> => {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      sighting_id: sightingId || null,
      is_read: false,
    });

    const { data: profile } = await supabase
      .from('profiles')
      .select('preferencias')
      .eq('id', userId)
      .maybeSingle();

    let pushToken: string | null = null;
    if (profile && profile.preferencias && typeof profile.preferencias === 'object') {
      pushToken = (profile.preferencias as Record<string, any>).push_token || null;
    }

    if (pushToken && pushToken.startsWith('ExponentPushToken[')) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: pushToken,
          sound: 'default',
          title,
          body: message,
          data: { sightingId, contributionId },
        }),
      });
    }
  } catch (e) {
    console.error('Error sending push notification:', e);
  }
};

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
