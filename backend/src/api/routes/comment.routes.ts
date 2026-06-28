import { Router } from 'express';
import { createComment, getComments, deleteComment } from '../../controllers/comment.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', authMiddleware, createComment);
router.get('/', getComments);              // público
router.delete('/:id', authMiddleware, deleteComment);

export default router;
