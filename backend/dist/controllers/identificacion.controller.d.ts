import { Request, Response, NextFunction } from 'express';
/**
 * POST /api/v1/identificacion/identificar
 *
 * Flujo Híbrido:
 *  1. Recibe sighting_id y photo_url del cliente (el cliente ya subió la foto y creó el registro en DB).
 *  2. Descarga la imagen desde photo_url.
 *  3. Valida el archivo (tamaño + MIME real).
 *  4. Ejecuta la identificación con IA en paralelo (HF + Gemma).
 *  5. Actualiza el avistamiento en `sightings` con los resultados de la IA usando privilegios de admin.
 *  6. Retorna el resultado al cliente.
 */
export declare function identificarAnimalController(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=identificacion.controller.d.ts.map