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

    // Payload mínimo y optimizado para la app móvil
    return res.status(200).json({
      success: true,
      token: data.session?.access_token, // Este JWT lo guardará el móvil en su Secure Storage
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
    });

  } catch (error) {
    next(error); // Pasa al manejador global de tu arquitectura
  }
}
