"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identificarAnimalController = identificarAnimalController;
const file_type_1 = require("file-type");
const config_1 = require("../infrastructure/config");
const AppError_1 = require("../infrastructure/AppError");
const identificacion_service_1 = require("../services/identificacion.service");
const ObservationRepository_1 = require("../models/ObservationRepository");
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
async function identificarAnimalController(req, res, next) {
    try {
        const file = req.file;
        if (!file) {
            throw new AppError_1.InvalidImageError('No se ha proporcionado ninguna imagen.');
        }
        const imagenBuffer = file.buffer;
        // --- Paso 1: Validar tamaño ---
        if (imagenBuffer.length > config_1.env.MAX_IMAGE_SIZE_BYTES) {
            const maxMb = Math.round(config_1.env.MAX_IMAGE_SIZE_BYTES / 1_048_576);
            throw new AppError_1.ImageTooLargeError(`La imagen excede el tamaño máximo permitido de ${maxMb} MB.`);
        }
        // --- Paso 2: Validar MIME type real (no confiar en Content-Type del cliente) ---
        const fileType = await (0, file_type_1.fileTypeFromBuffer)(imagenBuffer);
        const mimeTypeReal = fileType?.mime;
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!mimeTypeReal || !allowedMimes.includes(mimeTypeReal)) {
            throw new AppError_1.InvalidImageError(`Formato no soportado: '${mimeTypeReal ?? 'desconocido'}'. Permitidos: JPEG, PNG, WebP.`);
        }
        console.log(`[Controller] Imagen validada | nombre=${file.originalname} | mime=${mimeTypeReal} | tamaño=${imagenBuffer.length}b`);
        // --- Paso 3: Ejecutar pipeline de IA (HF + Gemma en paralelo) ---
        const resultado = await (0, identificacion_service_1.identificarAnimalService)(imagenBuffer, mimeTypeReal);
        // --- Paso 4: Subir imagen a Supabase Storage ---
        // TODO: Implementar subida al bucket `observaciones-media`
        // Por ahora se usa una URL placeholder hasta conectar el Storage client.
        const photoUrl = `https://${config_1.env.SUPABASE_URL?.replace('https://', '')}/storage/v1/object/public/observaciones-media/${Date.now()}-${file.originalname}`;
        // --- Paso 5: Leer y validar coordenadas GPS del form-data ---
        // decimal_latitude y decimal_longitude son NOT NULL en la DB.
        // La app móvil debe garantizar que siempre vengan antes de enviar la foto.
        const lat = req.body.lat ? parseFloat(req.body.lat) : undefined;
        const lng = req.body.lng ? parseFloat(req.body.lng) : undefined;
        if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
            throw new AppError_1.AppError('Las coordenadas GPS (lat, lng) son requeridas para registrar un avistamiento.', 400);
        }
        const accuracy = req.body.accuracy ? parseFloat(req.body.accuracy) : undefined;
        const observedAt = req.body.observed_at ? req.body.observed_at : new Date().toISOString();
        // --- Paso 6: Persistir el avistamiento en Supabase ---
        const sighting = await ObservationRepository_1.sightingRepository.createSighting({
            resultado,
            photoUrl,
            observedAt,
            latitude: lat,
            longitude: lng,
            gpsAccuracy: accuracy,
            preliminarySpecies: req.body.preliminary_species,
        });
        // --- Paso 7: Responder al cliente ---
        res.status(200).json({
            sighting_id: sighting.id,
            especie_principal: {
                etiqueta: resultado.especie_principal.etiqueta,
                confianza: resultado.especie_principal.confianza,
            },
            alternativas: resultado.alternativas,
            requiere_revision_humana: resultado.requiere_revision_humana,
            modelo_usado: resultado.modelo_usado,
            gemma_respuesta: resultado.gemma_respuesta,
        });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=identificacion.controller.js.map