import { Request, Response, NextFunction } from 'express';
export declare const createContribution: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/contributions/pending
 * Lista contribuciones en estado 'pending', ordenadas por antigüedad (FIFO).
 * Solo accesible por Especialistas.
 */
export declare const getPendingContributions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * PATCH /api/contributions/:id/validate
 * Asigna validated_species_id, cambia estado a 'validated' y registra rating.
 * El trigger de la BD se encarga del log en investigation_contribution_logs y la notificación.
 * Solo accesible por Especialistas (política RLS + verificación de rol).
 */
export declare const validateContribution: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * PATCH /api/contributions/:id/appeal
 * Cambia el estado a 'in_review' para abrir debate entre expertos.
 * Solo accesible por Especialistas.
 */
export declare const appealContribution: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=contribution.controller.d.ts.map