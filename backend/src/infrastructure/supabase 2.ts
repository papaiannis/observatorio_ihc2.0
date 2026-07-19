import { createClient } from '@supabase/supabase-js';
import { env } from './config.js';

/** Cliente anon: para verificar tokens de usuarios */
export const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_KEY!);

/**
 * Crea un cliente Supabase autenticado con el token JWT del usuario.
 * Usar en operaciones donde RLS debe evaluar auth.uid() correctamente.
 * @param userToken - JWT de acceso del usuario obtenido en el authMiddleware
 */
export function createAuthenticatedClient(userToken: string) {
  return createClient(env.SUPABASE_URL!, env.SUPABASE_KEY!, {
    global: {
      headers: { Authorization: `Bearer ${userToken}` },
    },
  });
}

