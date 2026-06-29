import { Router } from 'express';
import { getActiveInvestigations, getInvestigationById, createInvestigation, getMyInvestigations, updateInvestigation, deleteInvestigation } from '../../controllers/investigation.controller.js';
import { subscribe, unsubscribe, mySubscriptions } from '../../controllers/subscription.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
const router = Router();
// Endpoint para crear investigación (POST /)
router.post('/', authMiddleware, createInvestigation);
// Mis investigaciones creadas (GET /my) - Debe ir antes de /:id
router.get('/my', authMiddleware, getMyInvestigations);
// Suscripciones — my-subscriptions ANTES de /:id para evitar captura del parámetro
router.get('/my-subscriptions', authMiddleware, mySubscriptions);
// Investigaciones base
router.get('/active', authMiddleware, getActiveInvestigations);
router.get('/:id', authMiddleware, getInvestigationById);
// Actualizar y eliminar investigación (PATCH y DELETE /:id)
router.patch('/:id', authMiddleware, updateInvestigation);
router.delete('/:id', authMiddleware, deleteInvestigation);
// Suscribirse / desuscribirse a una investigación específica
router.post('/:id/subscribe', authMiddleware, subscribe);
router.delete('/:id/subscribe', authMiddleware, unsubscribe);
// 🔍 Endpoint de diagnóstico temporal solicitado
router.get('/ping', (req, res) => res.json({ pong: true, message: "Rutas de investigación actualizadas" }));
export default router;
//# sourceMappingURL=investigation.routes.js.map