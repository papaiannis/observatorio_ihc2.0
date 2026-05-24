"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentRepository = exports.likeRepository = exports.sightingRepository = exports.CommentRepository = exports.LikeRepository = exports.SightingRepository = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../infrastructure/config");
const AppError_1 = require("../infrastructure/AppError");
// ============================================================
// Repositorio principal: Avistamientos
// ============================================================
/**
 * Repositorio para la tabla `sightings`.
 *
 * Reglas de arquitectura aplicadas:
 * - `geom` es generado automáticamente por el trigger `trg_update_sighting_geom`.
 * - Cálculos espaciales delegados a PostGIS vía RPC (ST_DWithin).
 * - Imágenes/audios siempre como URLs de Storage, nunca como BLOB.
 */
class SightingRepository {
    supabase = null;
    constructor() {
        if (config_1.env.SUPABASE_URL && config_1.env.SUPABASE_KEY) {
            this.supabase = (0, supabase_js_1.createClient)(config_1.env.SUPABASE_URL, config_1.env.SUPABASE_KEY);
        }
        else {
            console.warn('[SightingRepository] Credenciales de Supabase no configuradas. Usando modo mock.');
        }
    }
    /**
     * Inserta un nuevo avistamiento en la tabla `sightings`.
     * El trigger de Postgres genera `geom` automáticamente desde lat/lng.
     */
    async createSighting(data) {
        if (!this.supabase) {
            return this._mockSighting(data);
        }
        const { data: result, error } = await this.supabase
            .from('sightings')
            .insert({
            user_id: data.userId ?? null,
            photo_url: data.photoUrl,
            audio_url: data.audioUrl ?? null,
            preliminary_species: data.preliminarySpecies ?? null,
            // Output de IA
            ai_especie_sugerida: data.resultado.especie_principal.etiqueta,
            ai_confianza: data.resultado.especie_principal.confianza,
            ai_requiere_revision: data.resultado.requiere_revision_humana,
            ai_modelo: data.resultado.modelo_usado,
            ai_alternativas: data.resultado.alternativas, // JSONB
            ai_gemma_respuesta: data.resultado.gemma_respuesta ?? null,
            // Ciclo de vida
            status: 'pendiente',
            // Geolocalización (trigger crea `geom` desde estas dos columnas)
            observed_at: data.observedAt,
            decimal_latitude: data.latitude,
            decimal_longitude: data.longitude,
            gps_accuracy: data.gpsAccuracy ?? null,
            metadata_edited: false,
        })
            .select()
            .single();
        if (error) {
            throw new AppError_1.AppError(`Error al guardar avistamiento en Supabase: ${error.message}`, 500);
        }
        return result;
    }
    /**
     * Retorna avistamientos dentro de un radio usando PostGIS ST_DWithin.
     * Delega el cálculo geoespacial a la función RPC `get_nearby_observations`.
     */
    async getNearbySightings(lat, lng, radiusMeters) {
        if (!this.supabase)
            return [];
        const { data, error } = await this.supabase.rpc('get_nearby_observations', {
            lat,
            lng,
            radius_meters: radiusMeters,
        });
        if (error) {
            throw new AppError_1.AppError(`Error en PostGIS ST_DWithin (RPC): ${error.message}`, 500);
        }
        return (data ?? []);
    }
    /**
     * Valida un avistamiento asignando una especie confirmada.
     * Solo especialistas/administradores pueden llamar este método (via RLS de Supabase).
     */
    async validateSighting(sightingId, validatedSpeciesId, newStatus) {
        if (!this.supabase) {
            throw new AppError_1.AppError('Supabase no configurado. No se puede validar.', 500);
        }
        const { data, error } = await this.supabase
            .from('sightings')
            .update({
            validated_species_id: validatedSpeciesId,
            status: newStatus,
            updated_at: new Date().toISOString(),
        })
            .eq('id', sightingId)
            .select()
            .single();
        if (error) {
            throw new AppError_1.AppError(`Error al validar avistamiento: ${error.message}`, 500);
        }
        return data;
    }
    _mockSighting(data) {
        console.warn('[SightingRepository] Modo mock: retornando objeto simulado.');
        return {
            id: 'mock-id-' + Date.now(),
            user_id: data.userId ?? null,
            photo_url: data.photoUrl,
            audio_url: data.audioUrl ?? null,
            preliminary_species: data.preliminarySpecies ?? null,
            validated_species_id: null,
            ai_especie_sugerida: data.resultado.especie_principal.etiqueta,
            ai_confianza: data.resultado.especie_principal.confianza,
            ai_requiere_revision: data.resultado.requiere_revision_humana,
            ai_modelo: data.resultado.modelo_usado,
            ai_alternativas: data.resultado.alternativas,
            ai_gemma_respuesta: data.resultado.gemma_respuesta ?? null,
            status: 'pendiente',
            observed_at: data.observedAt,
            decimal_latitude: data.latitude,
            decimal_longitude: data.longitude,
            gps_accuracy: data.gpsAccuracy ?? null,
            metadata_edited: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
    }
}
exports.SightingRepository = SightingRepository;
// ============================================================
// Repositorio: Likes
// ============================================================
/**
 * Repositorio para la tabla `likes`.
 * Usa PRIMARY KEY compuesta (user_id, sighting_id) para garantizar
 * que cada usuario solo tenga un like por avistamiento.
 */
class LikeRepository {
    supabase = null;
    constructor() {
        if (config_1.env.SUPABASE_URL && config_1.env.SUPABASE_KEY) {
            this.supabase = (0, supabase_js_1.createClient)(config_1.env.SUPABASE_URL, config_1.env.SUPABASE_KEY);
        }
    }
    /** Agrega un like. Si ya existe, Supabase retorna error de PK duplicada (ignorado). */
    async addLike(userId, sightingId) {
        if (!this.supabase)
            return;
        const { error } = await this.supabase
            .from('likes')
            .upsert({ user_id: userId, sighting_id: sightingId }, { onConflict: 'user_id,sighting_id' });
        if (error) {
            throw new AppError_1.AppError(`Error al agregar like: ${error.message}`, 500);
        }
    }
    /** Elimina un like de un usuario para un avistamiento específico. */
    async removeLike(userId, sightingId) {
        if (!this.supabase)
            return;
        const { error } = await this.supabase
            .from('likes')
            .delete()
            .eq('user_id', userId)
            .eq('sighting_id', sightingId);
        if (error) {
            throw new AppError_1.AppError(`Error al eliminar like: ${error.message}`, 500);
        }
    }
    /** Retorna la cantidad de likes de un avistamiento. */
    async getLikeCount(sightingId) {
        if (!this.supabase)
            return 0;
        const { count, error } = await this.supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('sighting_id', sightingId);
        if (error) {
            throw new AppError_1.AppError(`Error al contar likes: ${error.message}`, 500);
        }
        return count ?? 0;
    }
}
exports.LikeRepository = LikeRepository;
// ============================================================
// Repositorio: Comentarios
// ============================================================
/**
 * Repositorio para la tabla `comments`.
 */
class CommentRepository {
    supabase = null;
    constructor() {
        if (config_1.env.SUPABASE_URL && config_1.env.SUPABASE_KEY) {
            this.supabase = (0, supabase_js_1.createClient)(config_1.env.SUPABASE_URL, config_1.env.SUPABASE_KEY);
        }
    }
    /** Inserta un nuevo comentario en un avistamiento. */
    async addComment(userId, sightingId, content) {
        if (!this.supabase) {
            throw new AppError_1.AppError('Supabase no configurado.', 500);
        }
        const { data, error } = await this.supabase
            .from('comments')
            .insert({ user_id: userId, sighting_id: sightingId, content })
            .select()
            .single();
        if (error) {
            throw new AppError_1.AppError(`Error al agregar comentario: ${error.message}`, 500);
        }
        return data;
    }
    /**
     * Retorna todos los comentarios de un avistamiento.
     * Ordenados por fecha de creación ascendente (hilo cronológico).
     */
    async getCommentsBySighting(sightingId) {
        if (!this.supabase)
            return [];
        const { data, error } = await this.supabase
            .from('comments')
            .select('*')
            .eq('sighting_id', sightingId)
            .order('created_at', { ascending: true });
        if (error) {
            throw new AppError_1.AppError(`Error al obtener comentarios: ${error.message}`, 500);
        }
        return (data ?? []);
    }
    /** Elimina un comentario. Solo el autor puede borrar el suyo (via RLS en Supabase). */
    async deleteComment(commentId) {
        if (!this.supabase)
            return;
        const { error } = await this.supabase
            .from('comments')
            .delete()
            .eq('id', commentId);
        if (error) {
            throw new AppError_1.AppError(`Error al eliminar comentario: ${error.message}`, 500);
        }
    }
}
exports.CommentRepository = CommentRepository;
// ============================================================
// Singletons reutilizables en toda la app
// ============================================================
exports.sightingRepository = new SightingRepository();
exports.likeRepository = new LikeRepository();
exports.commentRepository = new CommentRepository();
//# sourceMappingURL=ObservationRepository.js.map