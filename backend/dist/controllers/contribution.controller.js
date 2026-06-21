import { z } from 'zod';
import { AppError } from '../infrastructure/AppError.js';
import { ContributionService } from '../services/contribution.service.js';
// Esquema de validación para la contribución
const contributionSchema = z.object({
    investigation_id: z.string().uuid("Debe ser un UUID válido"),
    preliminary_species: z.string().optional(),
    survey_answers: z.string().optional(), // JSON en string
    observed_at: z.string().datetime({ offset: true }).optional().or(z.string().optional()), // Acepta ISO 8601 o vacío
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    gps_accuracy: z.coerce.number().nonnegative().optional(),
});
export const createContribution = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new AppError('No autorizado', 401);
        }
        const file = req.file;
        if (!file) {
            throw new AppError('La foto es requerida', 400);
        }
        // Validar el body
        const parseResult = contributionSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw new AppError(`Datos inválidos: ${parseResult.error.message}`, 400);
        }
        // Llamar al servicio
        const result = await ContributionService.createContribution(user, parseResult.data, file);
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=contribution.controller.js.map