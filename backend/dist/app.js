import express from 'express';
import cors from 'cors';
import apiRouter from './api/router.js';
import { AppError } from './infrastructure/AppError.js';
const app = express();
// Middlewares globales
app.use(cors({ origin: '*' })); // Ajustar en producción
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Rutas
app.get('/', (req, res) => {
    res.json({ status: 'Backend Node.js funcionando' });
});
app.use('/api/v1', apiRouter);
// Handler global de errores
app.use((err, req, res, next) => {
    if (err instanceof AppError) {
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
export default app;
//# sourceMappingURL=app.js.map