export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    /**
     * Crea un error de aplicación estructurado.
     * @param message Mensaje seguro para enviar al cliente.
     * @param statusCode Código HTTP de estado.
     * @param isOperational True si es un error esperado (ej. validación, not found), false si es un bug de programación.
     */
    constructor(message: string, statusCode?: number, isOperational?: boolean);
}
export declare class InvalidImageError extends AppError {
    constructor(message?: string);
}
export declare class ImageTooLargeError extends AppError {
    constructor(message?: string);
}
export declare class IdentificationFailedError extends AppError {
    constructor(message?: string);
}
//# sourceMappingURL=AppError.d.ts.map