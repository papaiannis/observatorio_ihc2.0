import { supabase, createAuthenticatedClient } from '../infrastructure/supabase.js';
import { AppError } from '../infrastructure/AppError.js';

/**
 * Crea un comentario en una contribución.
 * Usa cliente autenticado para que RLS valide auth.uid() = user_id.
 */
export const createComment = async (
  sightingId: string,
  userId: string,
  content: string,
  userToken: string,
) => {
  const client = createAuthenticatedClient(userToken);
  const { data, error } = await client
    .from('comments')
    .insert({ sighting_id: sightingId, user_id: userId, content })
    .select('id, content, created_at, user_id')
    .single();

  if (error) throw new AppError(error.message, 500);
  return data;
};

/**
 * Lista los comentarios de una contribución, con datos del autor.
 * Lectura pública: usa cliente anon.
 */
export const getCommentsBySighting = async (sightingId: string) => {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      created_at,
      user:profiles!comments_user_id_fkey(username, avatar_url)
    `)
    .eq('sighting_id', sightingId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(`Error al obtener comentarios: ${error.message}`, 500);
  return data ?? [];
};

/**
 * Elimina un comentario validando que pertenezca al usuario (RLS cubre esto también,
 * pero verificamos en la respuesta por si el comentario no existe).
 */
export const deleteComment = async (
  commentId: string,
  userId: string,
  userToken: string,
) => {
  const client = createAuthenticatedClient(userToken);
  const { data, error } = await client
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId)
    .select('id');

  if (error) throw new AppError(error.message, 500);
  if (!data || data.length === 0) {
    throw new AppError('Comentario no encontrado o no autorizado', 404);
  }
  return data[0];
};
