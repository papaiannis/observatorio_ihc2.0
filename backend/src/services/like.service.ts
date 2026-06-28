import { supabase, createAuthenticatedClient } from '../infrastructure/supabase.js';
import { AppError } from '../infrastructure/AppError.js';

/**
 * Alterna el like de un usuario en una contribución.
 * Retorna { action: 'liked' | 'unliked' } para que el frontend actualice su UI.
 * Usa cliente autenticado para que RLS evalúe auth.uid().
 */
export const toggleLike = async (
  sightingId: string,
  userId: string,
  userToken: string,
): Promise<{ action: 'liked' | 'unliked' }> => {
  const client = createAuthenticatedClient(userToken);

  // Verificar si ya existe el like (lectura pública: anon client es suficiente)
  const { data: existing } = await supabase
    .from('likes')
    .select('user_id')
    .eq('sighting_id', sightingId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Eliminar like (requiere auth para RLS)
    const { error } = await client
      .from('likes')
      .delete()
      .eq('sighting_id', sightingId)
      .eq('user_id', userId);
    if (error) throw new AppError(error.message, 500);
    return { action: 'unliked' };
  }

  // Crear like
  const { error } = await client
    .from('likes')
    .insert({ sighting_id: sightingId, user_id: userId });
  if (error) throw new AppError(error.message, 500);
  return { action: 'liked' };
};

/**
 * Retorna el número exacto de likes de una contribución.
 * Lectura pública: usa cliente anon.
 */
export const countLikes = async (sightingId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('sighting_id', sightingId);

  if (error) throw new AppError(`Error al contar likes: ${error.message}`, 500);
  return count ?? 0;
};
