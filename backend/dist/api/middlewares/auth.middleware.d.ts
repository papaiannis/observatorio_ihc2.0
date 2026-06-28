import { Request, Response, NextFunction } from 'express';
/**
 * Middleware de autenticación estricto.
 * Rechaza la petición con 401 si no hay token o es inválido.
 * Usar en rutas que requieren usuario autenticado obligatoriamente.
 */
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware de autenticación opcional.
 * Si hay token válido, inyecta req.user igual que authMiddleware.
 * Si no hay token (o es inválido), continúa la petición con req.user = undefined.
 * Usar en rutas públicas que adaptan su respuesta según si el usuario está logueado.
 * Ejemplo: feed público con coordenadas ocultas para invitados.
 */
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map