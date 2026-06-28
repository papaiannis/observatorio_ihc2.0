import { Request, Response, NextFunction } from 'express';
import * as commentService from '../services/comment.service.js';
import { AppError } from '../infrastructure/AppError.js';

/**
 * POST /comments
 * Body: { sighting_id: string, content: string }
 */
export const createComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sighting_id, content } = req.body;
    if (!sighting_id || !content?.trim()) {
      throw new AppError('sighting_id y content son requeridos', 400);
    }
    const comment = await commentService.createComment(
      sighting_id,
      req.user!.id,
      content.trim(),
      req.user!.token!,
    );
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /comments?sighting_id=<uuid>
 * Público: no requiere autenticación.
 */
export const getComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sighting_id } = req.query;
    if (!sighting_id || typeof sighting_id !== 'string') {
      throw new AppError('sighting_id es requerido como query param', 400);
    }
    const comments = await commentService.getCommentsBySighting(sighting_id);
    res.json({ count: comments.length, comments });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /comments/:id
 * Solo el autor puede eliminar su comentario.
 */
export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await commentService.deleteComment(id, req.user!.id, req.user!.token!);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
