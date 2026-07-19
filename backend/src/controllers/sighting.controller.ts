import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../infrastructure/AppError.js';
import { SightingService } from '../services/sighting.service.js';
import { supabase } from '../infrastructure/supabase.js';

const sightingSchema = z.object({
  preliminary_species: z.string().optional(),
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

export const createSighting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.token) throw new AppError('No autenticado', 401);

    const file = req.file;
    if (!file) throw new AppError('Foto requerida', 400);

    const parseResult = sightingSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(`Datos inválidos: ${parseResult.error.message}`, 400);
    }

    const sighting = await SightingService.createSighting(
      user,
      user.token,
      parseResult.data,
      file
    );
    res.status(201).json(sighting);
  } catch (error) {
    next(error);
  }
};

export const getPendingSightings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.token) throw new AppError('No autenticado', 401);

    // Verificamos si el usuario es Especialista consultando profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role?.toLowerCase() !== 'especialista') {
      throw new AppError('No autorizado', 403);
    }

    const sightings = await SightingService.getPendingSightings(user.token);
    res.json({ count: sightings?.length ?? 0, sightings });
  } catch (error) {
    next(error);
  }
};

export const validateSighting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.token) throw new AppError('No autenticado', 401);

    const { id } = req.params;
    const parseResult = validateSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError(`Datos inválidos: ${parseResult.error.message}`, 400);
    }

    const { validated_species_id, expert_comment, expert_rating } = parseResult.data;
    const sighting = await SightingService.validateSighting(
      id as string,
      user.id,
      user.token,
      validated_species_id,
      expert_comment,
      expert_rating
    );

    res.json({ message: 'Avistamiento validado exitosamente', sighting });
  } catch (error) {
    next(error);
  }
};

export const appealSighting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.token) throw new AppError('No autenticado', 401);

    const { id } = req.params;
    const parseResult = appealSchema.safeParse(req.body);
    const notes = parseResult.success ? parseResult.data.notes : undefined;

    const sighting = await SightingService.appealSighting(id as string, user.token, notes);
    res.json({ message: 'Avistamiento en revisión', sighting });
  } catch (error) {
    next(error);
  }
};

export const getSightingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.token) throw new AppError('No autenticado', 401);

    const { id } = req.params;
    const sighting = await SightingService.getSightingById(id as string, user.id, user.token);
    res.json({ sighting });
  } catch (error) {
    next(error);
  }
};

export const getMySightings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.token) throw new AppError('No autenticado', 401);

    const sightings = await SightingService.getMySightings(user.id, user.token);
    res.json({ count: sightings?.length ?? 0, sightings });
  } catch (error) {
    next(error);
  }
};

export const getSightingsFeed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    // user.token puede no existir si la ruta usa optionalAuth
    const sightings = await SightingService.getSightingsFeed(user?.token);
    res.json({ count: sightings?.length ?? 0, sightings });
  } catch (error) {
    next(error);
  }
};

export const deleteSighting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.token) throw new AppError('No autenticado', 401);

    const { id } = req.params;
    const result = await SightingService.deleteSighting(id as string, user.id, user.token);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
