import { createClient } from '@supabase/supabase-js';
import { env } from '../infrastructure/config.js';
import { AppError } from '../infrastructure/AppError.js';
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
export class SightingRepository {
    supabase = null;
    constructor() {
        if (env.SUPABASE_URL && env.SUPABASE_KEY) {
            this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
        }
        else {
            console.warn('[SightingRepository] Credenciales de Supabase no configuradas. Usando modo mock.');
        }
    }
    /**
     * Actualiza un avistamiento existente con los resultados de la IA.
     * Utiliza la Service Role Key (env.SUPABASE_KEY) para saltarse las políticas RLS
     * ya que el usuario normal no tiene permisos para actualizar las columnas de IA.
     */
    async updateSightingWithAIResult(sightingId, result) {
        if (!this.supabase) {
            throw new AppError('Supabase no configurado en entorno remoto.', 500);
        }
        const { data, error } = await this.supabase
            .from('sightings')
            .update({
            ai_especie_sugerida: result.especie_principal.etiqueta,
            ai_confianza: result.especie_principal.confianza,
            ai_requiere_revision: result.requiere_revision_humana,
            ai_modelo: result.modelo_usado,
            ai_alternativas: result.alternativas,
            ai_gemma_respuesta: result.gemma_respuesta ?? null,
            status: result.requiere_revision_humana ? 'en_revision' : 'pendiente',
            updated_at: new Date().toISOString(),
        })
            .eq('id', sightingId)
            .select()
            .single();
        if (error) {
            throw new AppError(`Error al actualizar avistamiento con IA: ${error.message}`, 500);
        }
        return data;
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
            throw new AppError(`Error en PostGIS ST_DWithin (RPC): ${error.message}`, 500);
        }
        return (data ?? []);
    }
    /**
     * Valida un avistamiento asignando una especie confirmada.
     * Solo especialistas/administradores pueden llamar este método (via RLS de Supabase).
     */
    async validateSighting(sightingId, validatedSpeciesId, newStatus) {
        if (!this.supabase) {
            throw new AppError('Supabase no configurado. No se puede validar.', 500);
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
            throw new AppError(`Error al validar avistamiento: ${error.message}`, 500);
        }
        return data;
    }
    _mockSighting() {
        throw new AppError('Modo mock deshabilitado para actualizaciones.', 500);
    }
}
// ============================================================
// Repositorio: Likes
// ============================================================
/**
 * Repositorio para la tabla `likes`.
 * Usa PRIMARY KEY compuesta (user_id, sighting_id) para garantizar
 * que cada usuario solo tenga un like por avistamiento.
 */
export class LikeRepository {
    supabase = null;
    constructor() {
        if (env.SUPABASE_URL && env.SUPABASE_KEY) {
            this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
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
            throw new AppError(`Error al agregar like: ${error.message}`, 500);
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
            throw new AppError(`Error al eliminar like: ${error.message}`, 500);
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
            throw new AppError(`Error al contar likes: ${error.message}`, 500);
        }
        return count ?? 0;
    }
}
// ============================================================
// Repositorio: Comentarios
// ============================================================
/**
 * Repositorio para la tabla `comments`.
 */
export class CommentRepository {
    supabase = null;
    constructor() {
        if (env.SUPABASE_URL && env.SUPABASE_KEY) {
            this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
        }
    }
    /** Inserta un nuevo comentario en un avistamiento. */
    async addComment(userId, sightingId, content) {
        if (!this.supabase) {
            throw new AppError('Supabase no configurado.', 500);
        }
        const { data, error } = await this.supabase
            .from('comments')
            .insert({ user_id: userId, sighting_id: sightingId, content })
            .select()
            .single();
        if (error) {
            throw new AppError(`Error al agregar comentario: ${error.message}`, 500);
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
            throw new AppError(`Error al obtener comentarios: ${error.message}`, 500);
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
            throw new AppError(`Error al eliminar comentario: ${error.message}`, 500);
        }
    }
}
// ============================================================
// Singletons reutilizables en toda la app
// ============================================================
export const sightingRepository = new SightingRepository();
export const likeRepository = new LikeRepository();
export const commentRepository = new CommentRepository();
//# sourceMappingURL=ObservationRepository.js.map