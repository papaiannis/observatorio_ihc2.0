import { Request, Response, NextFunction } from 'express';
import * as subscriptionService from '../services/subscription.service.js';

/**
 * POST /investigations/:id/subscribe
 * Suscribe al usuario autenticado a la investigación indicada.
 */
export const subscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await subscriptionService.subscribe(id, req.user!.id, req.user!.token!);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /investigations/:id/subscribe
 * Cancela la suscripción del usuario autenticado.
 */
export const unsubscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await subscriptionService.unsubscribe(id, req.user!.id, req.user!.token!);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /investigations/my-subscriptions
 * Lista las investigaciones suscritas por el usuario autenticado.
 */
export const mySubscriptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subscriptions = await subscriptionService.getUserSubscriptions(
      req.user!.id,
      req.user!.token!,
    );
    res.json({ count: subscriptions.length, subscriptions });
  } catch (error) {
    next(error);
  }
};
