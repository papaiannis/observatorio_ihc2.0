import { Router } from 'express';
import { toggleLike, getLikeCount } from '../../controllers/like.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/toggle', authMiddleware, toggleLike);
router.get('/count', getLikeCount);   // público

export default router;
