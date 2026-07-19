import { Request, Response, NextFunction } from 'express';
import { getFeed, getObservatory } from '../services/feed.service.js';

/**
 * GET /api/feed
 * Feed completo de avistamientos (validados, pendientes, en revisión).
 * Si el usuario no está autenticado, se ocultan las coordenadas exactas.
 */
export const getFeedController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isGuest = !req.user;
    const items = await getFeed(isGuest);

    res.json({
      authenticated: !isGuest,
      coordinates_visible: !isGuest,
      count: items.length,
      feed: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/feed/observatory
 * Solo avistamientos validados científicamente (para el mapa del Observatorio).
 * Si el usuario no está autenticado, se ocultan las coordenadas exactas.
 */
export const getObservatoryController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const isGuest = !req.user;
    const items = await getObservatory(isGuest);

    res.json({
      authenticated: !isGuest,
      coordinates_visible: !isGuest,
      count: items.length,
      observatory: items,
    });
  } catch (error) {
    next(error);
  }
};
