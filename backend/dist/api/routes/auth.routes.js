import { Router } from 'express';
import { handleLogin } from '../../controllers/auth.controller.js';
const router = Router();
// Endpoint directo, sin middlewares pesados intermediarios
router.post('/auth/login', handleLogin);
export default router;
//# sourceMappingURL=auth.routes.js.map