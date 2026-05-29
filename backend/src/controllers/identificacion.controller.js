"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.identificarAnimalController = identificarAnimalController;
const file_type_1 = require("file-type");
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../infrastructure/config");
const AppError_1 = require("../infrastructure/AppError");
const identificacion_service_1 = require("../services/identificacion.service");
const ObservationRepository_1 = require("../models/ObservationRepository");
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
async function identificarAnimalController(req, res, next) {
    try {
        const { sighting_id, photo_url } = req.body;
        if (!sighting_id || !photo_url) {
            throw new AppError_1.AppError('Faltan parámetros requeridos: sighting_id o photo_url.', 400);
        }
        // --- Paso 1: Descargar imagen ---
        let imageResponse;
        try {
            imageResponse = await axios_1.default.get(photo_url, { responseType: 'arraybuffer', timeout: 15000 });
        }
        catch (error) {
            throw new AppError_1.AppError('No se pudo descargar la imagen desde la URL proporcionada.', 422);
        }
        const imagenBuffer = Buffer.from(imageResponse.data, 'binary');
        // --- Paso 2: Validar tamaño ---
        if (imagenBuffer.length > config_1.env.MAX_IMAGE_SIZE_BYTES) {
            const maxMb = Math.round(config_1.env.MAX_IMAGE_SIZE_BYTES / 1_048_576);
            throw new AppError_1.ImageTooLargeError(`La imagen excede el tamaño máximo permitido de ${maxMb} MB.`);
        }
        // --- Paso 3: Validar MIME type real ---
        const fileType = await (0, file_type_1.fileTypeFromBuffer)(imagenBuffer);
        const mimeTypeReal = fileType?.mime;
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!mimeTypeReal || !allowedMimes.includes(mimeTypeReal)) {
            throw new AppError_1.InvalidImageError(`Formato no soportado: '${mimeTypeReal ?? 'desconocido'}'. Permitidos: JPEG, PNG, WebP.`);
        }
        console.log(`[Controller] Imagen descargada y validada | mime=${mimeTypeReal} | tamaño=${imagenBuffer.length}b`);
        // --- Paso 4: Ejecutar pipeline de IA ---
        const resultado = await (0, identificacion_service_1.identificarAnimalService)(imagenBuffer, mimeTypeReal);
        // --- Paso 5: Actualizar el avistamiento en Supabase ---
        const sighting = await ObservationRepository_1.sightingRepository.updateSightingWithAIResult(sighting_id, resultado);
        // --- Paso 6: Responder al cliente ---
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