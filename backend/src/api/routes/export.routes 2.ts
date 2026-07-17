import { Router } from 'express';
import { exportCsvController } from '../../controllers/export.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/export/csv?investigation_id=<uuid>
// Solo accesible por Especialistas y Administradores (authMiddleware garantiza autenticación;
// el rol se puede validar a nivel de RLS o añadir un roleMiddleware si se requiere)
router.get('/csv', authMiddleware, exportCsvController);

export default router;
