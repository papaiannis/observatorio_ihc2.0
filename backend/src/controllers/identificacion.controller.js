"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identificarAnimalController = identificarAnimalController;
const file_type_1 = require("file-type");
const config_1 = require("../infrastructure/config");
const AppError_1 = require("../infrastructure/AppError");
const identificacion_service_1 = require("../services/identificacion.service");
const ObservationRepository_1 = require("../models/ObservationRepository");
/**
 * Endpoint POST /api/v1/identificacion/identificar
 * Se espera que el archivo esté en req.file (colocado por multer en la ruta)
 */
async function identificarAnimalController(req, res, next) {
    try {
        const file = req.file;
        if (!file) {
            throw new AppError_1.InvalidImageError("No se ha proporcionado ninguna imagen.");
        }
        const imagenBuffer = file.buffer;
        // --- Paso 1: Validar tamaño ---
        if (imagenBuffer.length > config_1.env.MAX_IMAGE_SIZE_BYTES) {
            const maxMb = config_1.env.MAX_IMAGE_SIZE_BYTES / 1048576;
            throw new AppError_1.ImageTooLargeError(`La imagen excede el tamaño máximo permitido de ${Math.round(maxMb)} MB.`);
        }
        // --- Paso 2: Validar MIME type real (Security Check) ---
        const fileType = await (0, file_type_1.fileTypeFromBuffer)(imagenBuffer);
        const mimeTypeReal = fileType?.mime;
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!mimeTypeReal || !allowedMimeTypes.includes(mimeTypeReal)) {
            throw new AppError_1.InvalidImageError(`Formato de imagen no soportado: '${mimeTypeReal || 'desconocido'}'. Formatos permitidos: JPEG, PNG, WebP.`);
        }
        console.log(`Imagen recibida y validada | nombre=${file.originalname} | mime=${mimeTypeReal} | tamaño=${imagenBuffer.length} bytes`);
        // --- Paso 3: Ejecutar el caso de uso (identificación paralela) ---
        const resultado = await (0, identificacion_service_1.identificarAnimalService)(imagenBuffer, mimeTypeReal);
        // --- Paso 4 (Integración Supabase): Guardar la observación en DB ---
        // Usamos datos dummy de GPS en el controller si no vienen en el form,
        // pero si vinieran en req.body (ej. req.body.lat), los mapeamos.
        const lat = req.body.lat ? parseFloat(req.body.lat) : undefined;
        const lng = req.body.lng ? parseFloat(req.body.lng) : undefined;
        const accuracy = req.body.accuracy ? parseFloat(req.body.accuracy) : undefined;
        // TODO: La subida de imagen al storage (bucket de Supabase) debería ocurrir aquí
        // y pasar la URL pública al repositorio. Usamos una dummy url por ahora.
        const fakeImageUrl = "https://bucket.supabase.com/dummy.jpg";
        await ObservationRepository_1.observationRepository.createObservation({
            resultado,
            latitude: lat,
            longitude: lng,
            accuracy: accuracy,
            imageUrl: fakeImageUrl
        });
        // --- Paso 5: Responder al cliente ---
        res.status(200).json(resultado);
    }
    catch (error) {
        // Pasar error al global error handler de Express
        next(error);
    }
}
//# sourceMappingURL=identificacion.controller.js.map