import { Request, Response, NextFunction } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import axios from 'axios';
import { env } from '../infrastructure/config.js';
import { AppError, InvalidImageError, ImageTooLargeError } from '../infrastructure/AppError.js';
import { identificarAnimalService } from '../services/identificacion.service.js';
import { sightingRepository } from '../models/ObservationRepository.js';

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
export async function identificarAnimalController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sighting_id, photo_url } = req.body;

    if (!sighting_id || !photo_url) {
      throw new AppError('Faltan parámetros requeridos: sighting_id o photo_url.', 400);
    }

    // --- Paso 1: Descargar imagen ---
    let imageResponse;
    try {
      imageResponse = await axios.get(photo_url, { responseType: 'arraybuffer', timeout: 15000 });
    } catch (error) {
      throw new AppError('No se pudo descargar la imagen desde la URL proporcionada.', 422);
    }

    const imagenBuffer = Buffer.from(imageResponse.data, 'binary');

    // --- Paso 2: Validar tamaño ---
    if (imagenBuffer.length > env.MAX_IMAGE_SIZE_BYTES) {
      const maxMb = Math.round(env.MAX_IMAGE_SIZE_BYTES / 1_048_576);
      throw new ImageTooLargeError(`La imagen excede el tamaño máximo permitido de ${maxMb} MB.`);
    }

    // --- Paso 3: Validar MIME type real ---
    const fileType = await fileTypeFromBuffer(imagenBuffer);
    const mimeTypeReal = fileType?.mime;
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!mimeTypeReal || !allowedMimes.includes(mimeTypeReal)) {
      throw new InvalidImageError(`Formato no soportado: '${mimeTypeReal ?? 'desconocido'}'. Permitidos: JPEG, PNG, WebP.`);
    }

    console.log(`[Controller] Imagen descargada y validada | mime=${mimeTypeReal} | tamaño=${imagenBuffer.length}b`);

    // --- Paso 4: Ejecutar pipeline de IA ---
    const resultado = await identificarAnimalService(imagenBuffer, mimeTypeReal);

    // --- Paso 5: Actualizar el avistamiento en Supabase ---
    const sighting = await sightingRepository.updateSightingWithAIResult(sighting_id, resultado);

    // --- Paso 6: Responder al cliente ---
    res.status(200).json({
      sighting_id: sighting.id,
      especie_principal: {
        etiqueta:   resultado.especie_principal.etiqueta,
        confianza:  resultado.especie_principal.confianza,
      },
      alternativas:            resultado.alternativas,
      requiere_revision_humana: resultado.requiere_revision_humana,
      modelo_usado:            resultado.modelo_usado,
      gemma_respuesta:         resultado.gemma_respuesta,
    });
  } catch (error) {
    next(error);
  }
}

