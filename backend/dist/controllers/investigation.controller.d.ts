import { Request, Response, NextFunction } from 'express';
export declare const getActiveInvestigations: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getInvestigationById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createInvestigation: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getMyInvestigations: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateInvestigation: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteInvestigation: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getInvestigationContributions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/v1/investigations/:id/survey-answers
 * Envía respuestas de encuesta a un proyecto directamente (incluso si no suben foto inmediata).
 */
export declare const submitSurveyAnswers: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=investigation.controller.d.ts.map