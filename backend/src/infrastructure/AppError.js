"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentificationFailedError = exports.ImageTooLargeError = exports.InvalidImageError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    isOperational;
    /**
     * Crea un error de aplicación estructurado.
     * @param message Mensaje seguro para enviar al cliente.
     * @param statusCode Código HTTP de estado.
     * @param isOperational True si es un error esperado (ej. validación, not found), false si es un bug de programación.
     */
    constructor(message, statusCode = 400, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        // Mantiene la traza de stack limpia en V8 (Node.js)
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class InvalidImageError extends AppError {
    constructor(message = "Formato de imagen inválido o archivo corrupto") {
        super(message, 422);
    }
}
exports.InvalidImageError = InvalidImageError;
class ImageTooLargeError extends AppError {
    constructor(message = "La imagen supera el tamaño máximo permitido") {
        super(message, 413);
    }
}
exports.ImageTooLargeError = ImageTooLargeError;
class IdentificationFailedError extends AppError {
    constructor(message = "El modelo no pudo identificar la especie") {
        super(message, 422);
    }
}
exports.IdentificationFailedError = IdentificationFailedError;
//# sourceMappingURL=AppError.js.map