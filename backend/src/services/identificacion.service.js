"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.identificarAnimalService = identificarAnimalService;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../infrastructure/config");
const AppError_1 = require("../infrastructure/AppError");
/**
 * Cliente de IA para llamar a Hugging Face
 */
async function clasificarImagenHF(imagenBuffer, mimeType) {
    const hfUrl = `https://router.huggingface.co/hf-inference/models/${config_1.env.HF_MODEL_ID}`;
    try {
        const response = await axios_1.default.post(hfUrl, imagenBuffer, {
            headers: {
                'Authorization': `Bearer ${config_1.env.HF_API_TOKEN}`,
                'Content-Type': mimeType,
            },
            timeout: 30000,
        });
        return response.data;
    }
    catch (error) {
        console.error("Error en HF API:", error?.response?.data || error.message);
        throw new AppError_1.IdentificationFailedError("Error al comunicarse con el modelo de clasificación visual.");
    }
}
/**
 * Cliente para llamar a Novita (Gemma) para validación experta local
 */
async function consultarGemma(imagenBuffer, mimeType) {
    if (!config_1.env.NOVITA_API_KEY) {
        return "API Key de Novita no configurada.";
    }
    try {
        const base64Img = imagenBuffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Img}`;
        const response = await axios_1.default.post('https://api.novita.ai/v3/openai/chat/completions', {
            model: "google/gemma-4-31b-it",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Actúa como un experto en zoología y biodiversidad de la región de la Guayana Venezolana. Identifica el animal de esta imagen, priorizando especies nativas de los estados Bolívar, Amazonas y Delta Amacuro. Responde estrictamente en el siguiente formato, sin texto adicional:\nNombre científico: [Nombre]"
                        },
                        {
                            type: "image_url",
                            image_url: { url: dataUrl }
                        }
                    ]
                }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${config_1.env.NOVITA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        return response.data.choices[0].message.content;
    }
    catch (error) {
        console.error("Error consultando Gemma:", error?.response?.data || error.message);
        return "Error al consultar Gemma";
    }
}
/**
 * Orquesta el flujo completo de identificación visual:
 * 1. Llama a Hugging Face para clasificación (principal).
 * 2. Llama a Gemma para una opinión experta basada en texto.
 * 3. Aplica la lógica de Failsafe (requiere_revision_humana).
 */
async function identificarAnimalService(imagenBuffer, mimeType) {
    // Ejecutamos ambas IAs en paralelo (Hugging Face y Gemma)
    const [prediccionesCrudas, gemmaRespuesta] = await Promise.all([
        clasificarImagenHF(imagenBuffer, mimeType),
        consultarGemma(imagenBuffer, mimeType)
    ]);
    if (!prediccionesCrudas || prediccionesCrudas.length === 0) {
        throw new AppError_1.IdentificationFailedError("No se encontraron candidatos válidos en la respuesta del modelo.");
    }
    // Ordenar por score descendente (por si acaso HF no lo hace)
    const candidatosOrdenados = prediccionesCrudas.sort((a, b) => b.score - a.score);
    const principal = candidatosOrdenados[0];
    if (!principal) {
        throw new AppError_1.IdentificationFailedError("No se encontró ningún resultado principal tras ordenar.");
    }
    // Aplicar Failsafe: umbral de confianza
    const requiereRevision = principal.score < config_1.env.CONFIDENCE_THRESHOLD;
    if (requiereRevision) {
        console.warn(`Confianza insuficiente (${principal.score} < ${config_1.env.CONFIDENCE_THRESHOLD}) — marcado para revisión humana.`);
    }
    const alternativas = candidatosOrdenados
        .slice(1, config_1.env.MAX_ALTERNATIVES + 1)
        .map(c => ({ etiqueta: c.label, confianza: c.score }));
    return {
        especie_principal: {
            etiqueta: principal.label,
            confianza: principal.score,
        },
        alternativas,
        requiere_revision_humana: requiereRevision,
        modelo_usado: config_1.env.HF_MODEL_ID,
        gemma_respuesta: gemmaRespuesta
    };
}
//# sourceMappingURL=identificacion.service.js.map