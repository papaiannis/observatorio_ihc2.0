"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const router_1 = __importDefault(require("./api/router"));
const AppError_1 = require("./infrastructure/AppError");
const app = (0, express_1.default)();
// Middlewares globales
app.use((0, cors_1.default)({ origin: '*' })); // Ajustar en producción
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Rutas
app.get('/', (req, res) => {
    res.json({ status: 'Backend Node.js funcionando' });
});
app.use('/api/v1', router_1.default);
// Handler global de errores
app.use((err, req, res, next) => {
    if (err instanceof AppError_1.AppError) {
        res.status(err.statusCode).json({
            detail: err.message
        });
        return;
    }
    // Errores no controlados (Bugs)
    console.error("❌ Error no controlado:", err);
    res.status(500).json({
        detail: "Error interno del servidor"
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map