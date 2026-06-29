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
export const getActiveInvestigations = async (req, res, next) => {
    try {
        const investigations = await InvestigationService.getActiveInvestigations();
        res.json(investigations);
    }
    catch (error) {
        next(error);
    }
};
export const getInvestigationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const investigation = await InvestigationService.getInvestigationById(id);
        res.json(investigation);
    }
    catch (error) {
        next(error);
    }
};
export const createInvestigation = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user || !user.token)
            throw new AppError('No autorizado', 401);
        const parseResult = createInvestigationSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new AppError(`Datos inválidos: ${parseResult.error.message}`, 400);
        }
        const investigation = await InvestigationService.createInvestigation(user.token, parseResult.data);
        res.status(201).json(investigation);
    }
    catch (error) {
        next(error);
    }
};
export const getMyInvestigations = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user || !user.token)
            throw new AppError('No autorizado', 401);
        const investigations = await InvestigationService.getMyInvestigations(user.id);
        res.json({ count: investigations.length, investigations });
    }
    catch (error) {
        next(error);
    }
};
export const updateInvestigation = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user || !user.token)
            throw new AppError('No autorizado', 401);
        const { id } = req.params;
        const parseResult = updateInvestigationSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new AppError(`Datos inválidos: ${parseResult.error.message}`, 400);
        }
        // Si el body está vacío
        if (Object.keys(parseResult.data).length === 0) {
            throw new AppError('Debe enviar al menos un campo para actualizar', 400);
        }
        const investigation = await InvestigationService.updateInvestigation(id, user.token, parseResult.data);
        res.json(investigation);
    }
    catch (error) {
        next(error);
    }
};
export const deleteInvestigation = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user || !user.token)
            throw new AppError('No autorizado', 401);
        const { id } = req.params;
        await InvestigationService.deleteInvestigation(id, user.token);
        res.json({ message: 'Investigación desactivada exitosamente', investigation_id: id });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=investigation.controller.js.map