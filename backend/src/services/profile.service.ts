import { supabase, createAuthenticatedClient } from '../infrastructure/supabase.js';
import { AppError } from '../infrastructure/AppError.js';

/**
 * Obtiene el perfil público de un usuario por username.
 * Lectura pública: no requiere token.
 */
export const getPublicProfile = async (username: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, reputation, total_ratings, created_at')
    .eq('username', username)
    .single();

  if (error || !data) throw new AppError('Usuario no encontrado', 404);
  return data;
};

/**
 * Actualiza el perfil del usuario autenticado.
 * Solo los campos permitidos: avatar_url y preferencias (campo JSON flexible).
 * Usa cliente autenticado para que RLS valide auth.uid() = id.
 */
export const updateOwnProfile = async (
  userId: string,
  updates: { avatar_url?: string; preferencias?: Record<string, unknown> },
  userToken: string,
  file?: Express.Multer.File,
) => {
  const payload: Record<string, unknown> = {};
  const client = createAuthenticatedClient(userToken);

  if (file) {
    const fileExt = file.originalname.split('.').pop() || 'jpg';
    const filePath = `avatars/${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Subir foto a Storage ('observaciones-media')
    const { error: uploadErr } = await client.storage
      .from('observaciones-media')
      .upload(filePath, file.buffer, { contentType: file.mimetype });

    if (uploadErr) {
      throw new AppError(`Error al subir avatar: ${uploadErr.message}`, 500);
    }

    const { data: publicUrlData } = client.storage
      .from('observaciones-media')
      .getPublicUrl(filePath);
      
    payload.avatar_url = publicUrlData.publicUrl;
  } else if (updates.avatar_url !== undefined) {
    payload.avatar_url = updates.avatar_url;
  }

  if (updates.preferencias !== undefined) payload.preferencias = updates.preferencias;

  if (Object.keys(payload).length === 0) {
    throw new AppError('Ningún campo válido para actualizar (avatar_url, preferencias)', 400);
  }

  const client = createAuthenticatedClient(userToken);
  const { data, error } = await client
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('id, username, avatar_url, preferencias')
    .single();

  if (error) throw new AppError(error.message, 500);
  return data;
};
