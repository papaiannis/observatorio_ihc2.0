import { Request, Response, NextFunction } from 'express';
import { supabase } from '../../infrastructure/supabase.js';
import { AppError } from '../../infrastructure/AppError.js';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No autorizado. Token requerido en el formato "Bearer <TOKEN>".', 401);
    }

    const token = authHeader.split(' ')[1];

    // Verificamos el token con Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AppError('Token inválido o expirado.', 401);
    }

    // Inyectamos el usuario y su token en la request para uso posterior
    // Con exactOptionalPropertyTypes=true, solo asignamos propiedades con valor definido
    req.user = {
      id: user.id,
      ...(user.email !== undefined && { email: user.email }),
      token,
    };
    
    next();
  } catch (error) {
    next(error);
  }
};
