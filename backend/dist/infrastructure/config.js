"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
// Cargar variables del .env si existe
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
    PORT: zod_1.z.coerce.number().default(8000),
    // Base de datos (Supabase)
    DATABASE_URL: zod_1.z.string().url("DATABASE_URL debe ser una URL válida (ej. postgres://...)").optional(),
    SUPABASE_URL: zod_1.z.string().url().optional(),
    SUPABASE_KEY: zod_1.z.string().optional(),
    // IA y APIs Externas
    HF_API_TOKEN: zod_1.z.string().min(1, "HF_API_TOKEN es requerido para inferencia"),
    HF_MODEL_ID: zod_1.z.string().default("google/vit-base-patch16-224"), // Modelo por defecto
    NOVITA_API_KEY: zod_1.z.string().optional(),
    YOUTUBE_API_KEY: zod_1.z.string().optional(),
    // Configuración de la App
    CONFIDENCE_THRESHOLD: zod_1.z.coerce.number().default(0.65),
    MAX_ALTERNATIVES: zod_1.z.coerce.number().default(3),
    MAX_IMAGE_SIZE_BYTES: zod_1.z.coerce.number().default(10485760), // 10MB
});
// Validación estricta de variables
const _env = envSchema.safeParse(process.env);
if (!_env.success) {
    console.error("❌ Invalid environment variables:", _env.error.format());
    throw new Error("Invalid environment variables");
}
exports.env = _env.data;
//# sourceMappingURL=config.js.map