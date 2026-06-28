import { Router } from 'express';
import multer from 'multer';
import { createContribution, getPendingContributions, validateContribution, appealContribution, } from '../../controllers/contribution.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
// POST /api/contributions — Crear contribución (cualquier usuario autenticado)
router.post('/', authMiddleware, upload.single('photo'), createContribution);
// GET /api/contributions/pending — Bandeja de pendientes (Solo Especialistas)
// RLS en Supabase garantiza que solo Especialistas pueden UPDATE; la lectura
// la protegemos también a nivel de rol via authMiddleware + política SELECT si se configura.
router.get('/pending', authMiddleware, getPendingContributions);
// PATCH /api/contributions/:id/validate — Validar contribución (Solo Especialistas)
router.patch('/:id/validate', authMiddleware, validateContribution);
// PATCH /api/contributions/:id/appeal — Apelar / poner en revisión (Solo Especialistas)
router.patch('/:id/appeal', authMiddleware, appealContribution);
export default router;
//# sourceMappingURL=contribution.routes.js.map