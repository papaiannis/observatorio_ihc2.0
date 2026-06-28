import { Router } from 'express';
import { getActiveInvestigations, getInvestigationById } from '../../controllers/investigation.controller.js';
import { subscribe, unsubscribe, mySubscriptions } from '../../controllers/subscription.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Suscripciones — my-subscriptions ANTES de /:id para evitar captura del parámetro
router.get('/my-subscriptions', authMiddleware, mySubscriptions);

// Investigaciones base
router.get('/active', authMiddleware, getActiveInvestigations);
router.get('/:id', authMiddleware, getInvestigationById);

// Suscribirse / desuscribirse a una investigación específica
router.post('/:id/subscribe', authMiddleware, subscribe);
router.delete('/:id/subscribe', authMiddleware, unsubscribe);

export default router;
