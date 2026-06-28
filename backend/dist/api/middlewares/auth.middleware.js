import { supabase } from '../../infrastructure/supabase.js';
import { AppError } from '../../infrastructure/AppError.js';
/**
 * Middleware de autenticación estricto.
 * Rechaza la petición con 401 si no hay token o es inválido.
 * Usar en rutas que requieren usuario autenticado obligatoriamente.
 */
export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('No autorizado. Token requerido en el formato "Bearer <TOKEN>".', 401);
        }
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            throw new AppError('Token inválido o expirado.', 401);
        }
        req.user = {
            id: user.id,
            ...(user.email !== undefined && { email: user.email }),
            ...(token !== undefined && { token }),
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
/**
 * Middleware de autenticación opcional.
 * Si hay token válido, inyecta req.user igual que authMiddleware.
 * Si no hay token (o es inválido), continúa la petición con req.user = undefined.
 * Usar en rutas públicas que adaptan su respuesta según si el usuario está logueado.
 * Ejemplo: feed público con coordenadas ocultas para invitados.
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Sin token: continuar como invitado
            return next();
        }
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
            req.user = {
                id: user.id,
                ...(user.email !== undefined && { email: user.email }),
                ...(token !== undefined && { token }),
            };
        }
        // Si el token es inválido, simplemente continuamos como invitado (no lanzamos error)
        next();
    }
    catch (error) {
        // En optionalAuth, cualquier error de middleware no bloquea la petición
        next();
    }
};
//# sourceMappingURL=auth.middleware.js.map