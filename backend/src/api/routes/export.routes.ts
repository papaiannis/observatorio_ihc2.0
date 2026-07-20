import { Router } from 'express';
import {
  exportCsvController,
  exportSingleSightingController,
  exportProjectController,
  exportMyController,
} from '../../controllers/export.controller.js';
import { authMiddleware, optionalAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/v1/export/csv?investigation_id=<uuid>
router.get('/csv', optionalAuth, exportCsvController);

// GET /api/v1/export/sighting/:id?format=csv|xlsx
router.get('/sighting/:id', optionalAuth, exportSingleSightingController);

// GET /api/v1/export/project/:id?format=csv|xlsx&only_validated=true|false
router.get('/project/:id', optionalAuth, exportProjectController);

// GET /api/v1/export/my?format=csv|xlsx
router.get('/my', authMiddleware, exportMyController);

export default router;
