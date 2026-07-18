import { Router } from 'express';
import {
  getActiveInvestigations,
  getInvestigationById,
  createInvestigation,
  getMyInvestigations,
  updateInvestigation,
  deleteInvestigation,
  getInvestigationContributions
} from '../../controllers/investigation.controller.js';
import { subscribe, unsubscribe, mySubscriptions } from '../../controllers/subscription.controller.js';
import { authMiddleware, optionalAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Endpoint para crear investigación (POST /)
router.post('/', authMiddleware, createInvestigation);

// Mis investigaciones creadas (GET /my) - Debe ir antes de /:id
router.get('/my', authMiddleware, getMyInvestigations);

// Suscripciones — my-subscriptions ANTES de /:id para evitar captura del parámetro
router.get('/my-subscriptions', authMiddleware, mySubscriptions);

// Investigaciones base
router.get('/active', optionalAuth, getActiveInvestigations);
router.get('/:id', optionalAuth, getInvestigationById);
router.get('/:id/contributions', authMiddleware, getInvestigationContributions);

// Actualizar y eliminar investigación (PATCH y DELETE /:id)
router.patch('/:id', authMiddleware, updateInvestigation);
router.delete('/:id', authMiddleware, deleteInvestigation);

// Suscribirse / desuscribirse a una investigación específica
router.post('/:id/subscribe', authMiddleware, subscribe);
router.delete('/:id/subscribe', authMiddleware, unsubscribe);

export default router;
