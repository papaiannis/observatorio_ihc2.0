import { Router } from 'express';
import multer from 'multer';
import { createContribution } from '../../controllers/contribution.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
router.post('/', authMiddleware, upload.single('photo'), createContribution);
export default router;
//# sourceMappingURL=contribution.routes.js.map