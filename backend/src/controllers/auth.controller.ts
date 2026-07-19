import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

import { env } from '../infrastructure/config.js';

// Inicialización limpia con la clave ANON (suficiente para autenticar usuarios)
const supabase = createClient(
  env.SUPABASE_URL!,
  env.SUPABASE_KEY!
);

export async function handleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    // Validación básica de presencia
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y contraseña requeridos.' });
    }

    // Petición directa a Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Si Supabase rebota las credenciales (400/401)
    if (error) {
      return res.status(401).json({ success: false, error: error.message });
    }

    // Obtener perfil completo del usuario (role, username, avatar)
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, role, avatar_url')
      .eq('id', data.user!.id)
      .single();

    // Payload completo para la app móvil
    return res.status(200).json({
      success: true,
      token: data.session?.access_token,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        username: profile?.username ?? null,
        role: profile?.role ?? 'entusiasta',
        avatar_url: profile?.avatar_url ?? null,
      },
    });

  } catch (error) {
    next(error); // Pasa al manejador global de tu arquitectura
  }
}
