import { Request, Response, NextFunction } from 'express';
/**
 * POST /api/v1/identificacion/identificar
 *
 * Flujo:
 *  1. Valida el archivo (tamaño + MIME real)
 *  2. Ejecuta la identificación con IA en paralelo (HF + Gemma)
 *  3. Sube la imagen a Supabase Storage          ← TODO (Step 3)
 *  4. Persiste el avistamiento en `sightings`
 *  5. Retorna el resultado al cliente
 */
export declare function identificarAnimalController(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=identificacion.controller.d.ts.map