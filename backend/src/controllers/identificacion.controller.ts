import { Request, Response, NextFunction } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import { env } from '../infrastructure/config';
import { InvalidImageError, ImageTooLargeError } from '../infrastructure/AppError';
import { identificarAnimalService } from '../services/identificacion.service';
import { observationRepository } from '../models/ObservationRepository';

/**
 * Endpoint POST /api/v1/identificacion/identificar
 * Se espera que el archivo esté en req.file (colocado por multer en la ruta)
 */
export async function identificarAnimalController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;

    if (!file) {
      throw new InvalidImageError("No se ha proporcionado ninguna imagen.");
    }

    const imagenBuffer = file.buffer;

    // --- Paso 1: Validar tamaño ---
    if (imagenBuffer.length > env.MAX_IMAGE_SIZE_BYTES) {
      const maxMb = env.MAX_IMAGE_SIZE_BYTES / 1048576;
      throw new ImageTooLargeError(`La imagen excede el tamaño máximo permitido de ${Math.round(maxMb)} MB.`);
    }

    // --- Paso 2: Validar MIME type real (Security Check) ---
    const fileType = await fileTypeFromBuffer(imagenBuffer);
    const mimeTypeReal = fileType?.mime;
    
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!mimeTypeReal || !allowedMimeTypes.includes(mimeTypeReal)) {
      throw new InvalidImageError(
        `Formato de imagen no soportado: '${mimeTypeReal || 'desconocido'}'. Formatos permitidos: JPEG, PNG, WebP.`
      );
    }

    console.log(`Imagen recibida y validada | nombre=${file.originalname} | mime=${mimeTypeReal} | tamaño=${imagenBuffer.length} bytes`);

    // --- Paso 3: Ejecutar el caso de uso (identificación paralela) ---
    const resultado = await identificarAnimalService(imagenBuffer, mimeTypeReal);

    // --- Paso 4 (Integración Supabase): Guardar la observación en DB ---
    // Usamos datos dummy de GPS en el controller si no vienen en el form,
    // pero si vinieran en req.body (ej. req.body.lat), los mapeamos.
    const lat = req.body.lat ? parseFloat(req.body.lat) : undefined;
    const lng = req.body.lng ? parseFloat(req.body.lng) : undefined;
    const accuracy = req.body.accuracy ? parseFloat(req.body.accuracy) : undefined;

    // TODO: La subida de imagen al storage (bucket de Supabase) debería ocurrir aquí
    // y pasar la URL pública al repositorio. Usamos una dummy url por ahora.
    const fakeImageUrl = "https://bucket.supabase.com/dummy.jpg";

    await observationRepository.createObservation({
      resultado,
      latitude: lat,
      longitude: lng,
      accuracy: accuracy,
      imageUrl: fakeImageUrl
    });

    // --- Paso 5: Responder al cliente ---
    res.status(200).json(resultado);
  } catch (error) {
    // Pasar error al global error handler de Express
    next(error);
  }
}
