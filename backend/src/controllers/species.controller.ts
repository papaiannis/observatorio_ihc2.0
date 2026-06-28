import { Request, Response, NextFunction } from 'express';
import { searchSpecies } from '../services/species.service.js';
import { AppError } from '../infrastructure/AppError.js';

/**
 * GET /api/species/search?q=<término>
 * Busca especies por nombre científico o nombre común.
 * Accesible por Especialistas durante el flujo de validación.
 */
export const searchSpeciesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const q = req.query.q;

    if (!q || typeof q !== 'string') {
      throw new AppError('El parámetro "q" es requerido.', 400);
    }

    const results = await searchSpecies(q);

    res.json({ count: results.length, species: results });
  } catch (error) {
    next(error);
  }
};
