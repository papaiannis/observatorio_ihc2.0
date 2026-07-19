import { z } from 'zod';
import { InvestigationService } from '../services/investigation.service.js';
import { AppError } from '../infrastructure/AppError.js';
import { createAuthenticatedClient } from '../infrastructure/supabase.js';
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
        const investigation = await InvestigationService.createInvestigation(user.id, user.token, parseResult.data);
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
export const getInvestigationContributions = async (req, res, next) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { status, limit, offset } = req.query;
        const inv = await InvestigationService.getInvestigationById(id);
        if (!inv)
            throw new AppError('Investigación no encontrada', 404);
        const queryParams = {};
        if (status)
            queryParams.status = status;
        if (limit)
            queryParams.limit = parseInt(limit, 10);
        if (offset)
            queryParams.offset = parseInt(offset, 10);
        const result = await InvestigationService.getContributionsByInvestigation(id, user?.token, queryParams);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
/**
 * POST /api/v1/investigations/:id/survey-answers
 * Envía respuestas de encuesta a un proyecto directamente (incluso si no suben foto inmediata).
 */
export const submitSurveyAnswers = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user || !user.token)
            throw new AppError('No autorizado', 401);
        const { id } = req.params;
        const { answers } = req.body;
        if (!answers)
            throw new AppError('Las respuestas son requeridas', 400);
        const authClient = createAuthenticatedClient(user.token);
        // Insertamos la respuesta como contribución del proyecto
        const { data, error } = await authClient
            .from('investigation_contributions')
            .insert({
            investigation_id: id,
            user_id: user.id,
            photo_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200&auto=format&fit=crop',
            survey_answers: typeof answers === 'string' ? JSON.parse(answers) : answers,
            observed_at: new Date().toISOString(),
            contribution_status: 'pending',
        })
            .select('*')
            .maybeSingle();
        if (error)
            throw new AppError(error.message, 500);
        res.status(201).json({ message: 'Respuestas de encuesta enviadas y registradas en el proyecto.', contribution: data });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=investigation.controller.js.map