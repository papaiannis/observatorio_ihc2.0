import { IResultadoIdentificacion } from '../models/ObservationRepository.js';
/**
 * Orquesta el flujo completo de identificación visual:
 * 1. Llama a Hugging Face para clasificación (principal).
 * 2. Llama a Gemma para una opinión experta basada en texto.
 * 3. Aplica la lógica de Failsafe (requiere_revision_humana).
 */
export declare function identificarAnimalService(imagenBuffer: Buffer, mimeType: string): Promise<IResultadoIdentificacion>;
//# sourceMappingURL=identificacion.service.d.ts.map