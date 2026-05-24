import { z } from "zod";
import dotenv from "dotenv";

// Cargar variables del .env si existe
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8000),
  
  // Base de datos (Supabase)
  DATABASE_URL: z.string().url("DATABASE_URL debe ser una URL válida (ej. postgres://...)").optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_KEY: z.string().optional(),

  // IA y APIs Externas
  HF_API_TOKEN: z.string().min(1, "HF_API_TOKEN es requerido para inferencia"),
  HF_MODEL_ID: z.string().default("google/vit-base-patch16-224"), // Modelo por defecto
  NOVITA_API_KEY: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),

  // Configuración de la App
  CONFIDENCE_THRESHOLD: z.coerce.number().default(0.65),
  MAX_ALTERNATIVES: z.coerce.number().default(3),
  MAX_IMAGE_SIZE_BYTES: z.coerce.number().default(10485760), // 10MB
});

// Validación estricta de variables
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
