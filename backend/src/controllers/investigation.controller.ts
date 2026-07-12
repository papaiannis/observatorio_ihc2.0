import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { InvestigationService } from '../services/investigation.service.js';
import { AppError } from '../infrastructure/AppError.js';

const baseInvestigationSchema = {
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  start_date: z.string(), // Acepta ISO dates YYYY-MM-DD
  end_date: z.string(),
  area_geom: z.any().optional(), // Puede ser un objeto GeoJSON o WKT string
  methods: z.string().optional(),
  tools_url: z.string().url().optional().or(z.literal('')),
  survey_questions: z.array(z.any()).optional(), // Lista de preguntas
  status: z.enum(['active', 'inactive', 'archived']).optional(),
};

const createInvestigationSchema = z.object(baseInvestigationSchema);
const updateInvestigationSchema = z.object(baseInvestigationSchema).partial();

export const getActiveInvestigations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const investigations = await InvestigationService.getActiveInvestigations();
    res.json(investigations);
  } catch (error) {
    next(error);
  }
};

export const getInvestigationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const investigation = await InvestigationService.getInvestigationById(id as string);
    res.json(investigation);
  } catch (error) {
    next(error);
  }
};

export const createInvestigation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user || !user.token) throw new AppError('No autorizado', 401);

    const parseResult = createInvestigationSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(`Datos inválidos: ${parseResult.error.message}`, 400);
    }

    const investigation = await InvestigationService.createInvestigation(user.id, user.token, parseResult.data);
    res.status(201).json(investigation);
  } catch (error) {
    next(error);
  }
};

export const getMyInvestigations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user || !user.token) throw new AppError('No autorizado', 401);

    const investigations = await InvestigationService.getMyInvestigations(user.id);
    res.json({ count: investigations.length, investigations });
  } catch (error) {
    next(error);
  }
};

export const updateInvestigation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user || !user.token) throw new AppError('No autorizado', 401);

    const { id } = req.params;
    const parseResult = updateInvestigationSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(`Datos inválidos: ${parseResult.error.message}`, 400);
    }

    // Si el body está vacío
    if (Object.keys(parseResult.data).length === 0) {
      throw new AppError('Debe enviar al menos un campo para actualizar', 400);
    }

    const investigation = await InvestigationService.updateInvestigation(id as string, user.token, parseResult.data);
    res.json(investigation);
  } catch (error) {
    next(error);
  }
};

export const deleteInvestigation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user || !user.token) throw new AppError('No autorizado', 401);

    const { id } = req.params;
    await InvestigationService.deleteInvestigation(id as string, user.token);
    res.json({ message: 'Investigación desactivada exitosamente', investigation_id: id });
  } catch (error) {
    next(error);
  }
};

export const getInvestigationContributions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user || !user.token) throw new AppError('No autorizado', 401);

    const { id } = req.params;
    const { status, limit, offset } = req.query;

    const inv = await InvestigationService.getInvestigationById(id as string);
    if (!inv) throw new AppError('Investigación no encontrada', 404);

    // Permitir al creador ver todas las contribuciones. 
    // Podría también permitirse a un Admin o Especialista según las reglas del negocio, 
    // por ahora limitamos al creador como se solicita en el plan.
    if (inv.created_by !== user.id) {
      throw new AppError('No autorizado para ver estas contribuciones', 403);
    }

    const result = await InvestigationService.getContributionsByInvestigation(
      id as string,
      user.token,
      {
        ...(status && { status: status as string }),
        ...(limit && { limit: parseInt(limit as string, 10) }),
        ...(offset && { offset: parseInt(offset as string, 10) })
      }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};
