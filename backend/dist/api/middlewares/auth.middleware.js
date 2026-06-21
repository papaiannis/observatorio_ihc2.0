import { supabase } from '../../infrastructure/supabase.js';
import { AppError } from '../../infrastructure/AppError.js';
export const authMiddleware = async (req, res, next) => {
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
        // Inyectamos el usuario en la request para su uso posterior
        req.user = { id: user.id, email: user.email };
        next();
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=auth.middleware.js.map