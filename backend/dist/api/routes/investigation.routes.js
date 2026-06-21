import { Router } from 'express';
import { getActiveInvestigations, getInvestigationById } from '../../controllers/investigation.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
const router = Router();
// Rutas públicas o protegidas (usaremos protegidas por ahora ya que en general la app requiere auth)
// o podríamos dejar getActiveInvestigations público, pero asumamos protegido como indica la regla "Usuarios autenticados"
router.get('/active', authMiddleware, getActiveInvestigations);
router.get('/:id', authMiddleware, getInvestigationById);
export default router;
//# sourceMappingURL=investigation.routes.js.map