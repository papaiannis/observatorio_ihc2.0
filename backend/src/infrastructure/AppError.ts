export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  /**
   * Crea un error de aplicación estructurado.
   * @param message Mensaje seguro para enviar al cliente.
   * @param statusCode Código HTTP de estado.
   * @param isOperational True si es un error esperado (ej. validación, not found), false si es un bug de programación.
   */
  constructor(message: string, statusCode: number = 400, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Mantiene la traza de stack limpia en V8 (Node.js)
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidImageError extends AppError {
  constructor(message: string = "Formato de imagen inválido o archivo corrupto") {
    super(message, 422);
  }
}

export class ImageTooLargeError extends AppError {
  constructor(message: string = "La imagen supera el tamaño máximo permitido") {
    super(message, 413);
  }
}

export class IdentificationFailedError extends AppError {
  constructor(message: string = "El modelo no pudo identificar la especie") {
    super(message, 422);
  }
}
