import { Request, Response, NextFunction } from 'express';
import * as likeService from '../services/like.service.js';
import { AppError } from '../infrastructure/AppError.js';

/**
 * POST /likes/toggle
 * Body: { sighting_id: string }
 * Retorna { action: 'liked' | 'unliked' }
 */
export const toggleLike = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sighting_id } = req.body;
    if (!sighting_id) throw new AppError('sighting_id es requerido', 400);
    const result = await likeService.toggleLike(sighting_id, req.user!.id, req.user!.token!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /likes/count?sighting_id=<uuid>
 * Público: no requiere autenticación.
 */
export const getLikeCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sighting_id } = req.query;
    if (!sighting_id || typeof sighting_id !== 'string') {
      throw new AppError('sighting_id es requerido como query param', 400);
    }
    const count = await likeService.countLikes(sighting_id);
    res.json({ sighting_id, count });
  } catch (error) {
    next(error);
  }
};
