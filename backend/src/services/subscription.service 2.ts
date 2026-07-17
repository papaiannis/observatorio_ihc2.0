import { supabase, createAuthenticatedClient } from '../infrastructure/supabase.js';
import { AppError } from '../infrastructure/AppError.js';

/**
 * Suscribe a un usuario a una investigación activa.
 * Usa código de error 23505 (unique_violation) para detectar suscripción duplicada.
 */
export const subscribe = async (
  investigationId: string,
  userId: string,
  userToken: string,
): Promise<{ message: string }> => {
  // Verificar que la investigación existe y está activa (lectura pública)
  const { data: inv, error: invErr } = await supabase
    .from('investigations')
    .select('id')
    .eq('id', investigationId)
    .eq('status', 'active')
    .single();

  if (invErr || !inv) {
    throw new AppError('Investigación no encontrada o inactiva', 404);
  }

  const client = createAuthenticatedClient(userToken);
  const { error } = await client
    .from('investigation_subscriptions')
    .insert({ investigation_id: investigationId, user_id: userId });

  if (error) {
    // 23505 = unique_violation (ya existe la suscripción)
    if (error.code === '23505') throw new AppError('Ya estás suscrito a esta investigación', 409);
    throw new AppError(error.message, 500);
  }

  return { message: 'Suscrito exitosamente' };
};

/**
 * Cancela la suscripción de un usuario a una investigación.
 */
export const unsubscribe = async (
  investigationId: string,
  userId: string,
  userToken: string,
): Promise<{ message: string }> => {
  const client = createAuthenticatedClient(userToken);
  const { error } = await client
    .from('investigation_subscriptions')
    .delete()
    .eq('investigation_id', investigationId)
    .eq('user_id', userId);

  if (error) throw new AppError(error.message, 500);
  return { message: 'Desuscripción exitosa' };
};

/**
 * Lista todas las investigaciones a las que el usuario está suscrito,
 * incluyendo los detalles completos de cada investigación.
 */
export const getUserSubscriptions = async (
  userId: string,
  userToken: string,
) => {
  const client = createAuthenticatedClient(userToken);
  const { data, error } = await client
    .from('investigation_subscriptions')
    .select(`
      investigation_id,
      subscribed_at,
      investigations (
        id,
        title,
        description,
        start_date,
        end_date,
        status
      )
    `)
    .eq('user_id', userId)
    .order('subscribed_at', { ascending: false });

  if (error) throw new AppError(`Error al obtener suscripciones: ${error.message}`, 500);

  // Aplanar para retornar solo los datos de la investigación
  return (data ?? []).map((item: any) => ({
    subscribed_at: item.subscribed_at,
    ...item.investigations,
  }));
};
