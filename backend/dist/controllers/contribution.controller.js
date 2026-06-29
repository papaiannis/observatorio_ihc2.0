import { z } from 'zod';
import { AppError } from '../infrastructure/AppError.js';
import { ContributionService } from '../services/contribution.service.js';
import { supabase, createAuthenticatedClient } from '../infrastructure/supabase.js';
// ─── Esquemas de validación ────────────────────────────────────────────────────
const contributionSchema = z.object({
    investigation_id: z.string().uuid('Debe ser un UUID válido'),
    preliminary_species: z.string().optional(),
    survey_answers: z.string().optional(),
    observed_at: z
        .string()
        .datetime({ offset: true })
        .optional()
        .or(z.string().optional()),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    gps_accuracy: z.coerce.number().nonnegative().optional(),
});
const validateSchema = z.object({
    validated_species_id: z.string().uuid('El ID de especie debe ser un UUID válido'),
    expert_comment: z.string().max(1000).optional(),
    expert_rating: z.coerce.number().int().min(1).max(5).optional(),
});
const appealSchema = z.object({
    notes: z.string().max(500).optional(),
});
// ─── Crear contribución ────────────────────────────────────────────────────────
export const createContribution = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user)
            throw new AppError('No autorizado', 401);
        const userToken = user.token;
        if (!userToken)
            throw new AppError('Token de autenticación no disponible', 401);
        const file = req.file;
        if (!file)
            throw new AppError('La foto es requerida', 400);
        const parseResult = contributionSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new AppError(`Datos inválidos: ${parseResult.error.message}`, 400);
        }
        const result = await ContributionService.createContribution(user, userToken, parseResult.data, file);
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
};
// ─── Obtener contribuciones pendientes ────────────────────────────────────────
/**
 * GET /api/contributions/pending
 * Lista contribuciones en estado 'pending', ordenadas por antigüedad (FIFO).
 * Solo accesible por Especialistas.
 */
export const getPendingContributions = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('investigation_contributions')
            .select(`
        id,
        photo_url,
        preliminary_species,
        observed_at,
        decimal_latitude,
        decimal_longitude,
        survey_answers,
        created_at,
        investigation_id,
        user_id,
        profiles!investigation_contributions_user_id_fkey!inner(username)
      `)
            .eq('contribution_status', 'pending')
            .order('created_at', { ascending: true }); // Más antiguo primero (criterio científico)
        if (error)
            throw new AppError(error.message, 500);
        res.json({ count: data?.length ?? 0, contributions: data ?? [] });
    }
    catch (error) {
        next(error);
    }
};
// ─── Validar contribución ─────────────────────────────────────────────────────
/**
 * PATCH /api/contributions/:id/validate
 * Asigna validated_species_id, cambia estado a 'validated' y registra rating.
 * El trigger de la BD se encarga del log en investigation_contribution_logs y la notificación.
 * Solo accesible por Especialistas (política RLS + verificación de rol).
 */
export const validateContribution = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user)
            throw new AppError('No autorizado', 401);
        if (!user.token)
            throw new AppError('Token requerido', 401);
        const { id } = req.params;
        const parseResult = validateSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new AppError(`Datos inválidos: ${parseResult.error.message}`, 400);
        }
        const { validated_species_id, expert_comment, expert_rating } = parseResult.data;
        // 1. Verificar que la especie existe en el catálogo
        const { data: species, error: spError } = await supabase
            .from('species')
            .select('id, scientific_name')
            .eq('id', validated_species_id)
            .single();
        if (spError || !species) {
            throw new AppError('La especie indicada no existe en el catálogo.', 400);
        }
        // 2. Actualizar la contribución usando el cliente autenticado del especialista (respeta RLS)
        const authClient = createAuthenticatedClient(user.token);
        const { data, error } = await authClient
            .from('investigation_contributions')
            .update({
            validated_species_id,
            contribution_status: 'validated',
            expert_comment: expert_comment ?? null,
            expert_rating: expert_rating ?? null,
            rated_by: user.id,
            rated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select('id, user_id, contribution_status')
            .maybeSingle();
        if (error)
            throw new AppError(error.message, 500);
        if (!data)
            throw new AppError('Contribución no encontrada.', 404);
        // El trigger trg_contribution_status_change ya creó el log y la notificación en la BD.
        res.json({
            message: `Contribución validada exitosamente como "${species.scientific_name}".`,
            contribution: data,
        });
    }
    catch (error) {
        next(error);
    }
};
// ─── Apelar contribución ──────────────────────────────────────────────────────
/**
 * PATCH /api/contributions/:id/appeal
 * Cambia el estado a 'in_review' para abrir debate entre expertos.
 * Solo accesible por Especialistas.
 */
export const appealContribution = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user)
            throw new AppError('No autorizado', 401);
        if (!user.token)
            throw new AppError('Token requerido', 401);
        const { id } = req.params;
        const parseResult = appealSchema.safeParse(req.body);
        const notes = parseResult.success ? parseResult.data.notes : undefined;
        const authClient = createAuthenticatedClient(user.token);
        const { data, error } = await authClient
            .from('investigation_contributions')
            .update({
            contribution_status: 'in_review',
            expert_comment: notes ?? null,
            rated_by: user.id,
            rated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select('id, contribution_status')
            .maybeSingle();
        if (error)
            throw new AppError(error.message, 500);
        if (!data)
            throw new AppError('Contribución no encontrada.', 404);
        // El trigger trg_contribution_status_change ya creó el log y la notificación.
        res.json({
            message: 'Contribución marcada como "En revisión". El debate de expertos puede comenzar.',
            contribution: data,
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=contribution.controller.js.map