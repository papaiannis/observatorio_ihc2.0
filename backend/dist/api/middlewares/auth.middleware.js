"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../../infrastructure/config");
const AppError_1 = require("../../infrastructure/AppError");
// Inicializamos el cliente de Supabase
const supabase = (0, supabase_js_1.createClient)(config_1.env.SUPABASE_URL, config_1.env.SUPABASE_KEY);
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError_1.AppError('No autorizado. Token requerido en el formato "Bearer <TOKEN>".', 401);
        }
        const token = authHeader.split(' ')[1];
        // Verificamos el token con Supabase Auth
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            throw new AppError_1.AppError('Token inválido o expirado.', 401);
        }
        // Inyectamos el usuario en la request para su uso posterior
        req.user = { id: user.id, email: user.email };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.middleware.js.map