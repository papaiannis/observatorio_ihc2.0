/** Output del pipeline de IA (Hugging Face + Gemma) */
export interface IResultadoIdentificacion {
    especie_principal: {
        etiqueta: string;
        confianza: number;
    };
    alternativas: Array<{
        etiqueta: string;
        confianza: number;
    }>;
    requiere_revision_humana: boolean;
    modelo_usado: string;
    gemma_respuesta?: string;
}
/** Fila completa de la tabla `sightings` */
export interface ISighting {
    id: string;
    user_id: string | null;
    photo_url: string;
    audio_url: string | null;
    preliminary_species: string | null;
    validated_species_id: string | null;
    ai_especie_sugerida: string;
    ai_confianza: number;
    ai_requiere_revision: boolean;
    ai_modelo: string;
    ai_alternativas: object;
    ai_gemma_respuesta: string | null;
    status: 'pendiente' | 'validado' | 'en_revision';
    observed_at: string;
    decimal_latitude: number;
    decimal_longitude: number;
    gps_accuracy: number | null;
    metadata_edited: boolean;
    created_at: string;
    updated_at: string;
}
/** Fila de la tabla `likes` */
export interface ILike {
    user_id: string;
    sighting_id: string;
    created_at: string;
}
/** Fila de la tabla `comments` */
export interface IComment {
    id: string;
    sighting_id: string;
    user_id: string;
    content: string;
    created_at: string;
}
/**
 * Repositorio para la tabla `sightings`.
 *
 * Reglas de arquitectura aplicadas:
 * - `geom` es generado automáticamente por el trigger `trg_update_sighting_geom`.
 * - Cálculos espaciales delegados a PostGIS vía RPC (ST_DWithin).
 * - Imágenes/audios siempre como URLs de Storage, nunca como BLOB.
 */
export declare class SightingRepository {
    private supabase;
    constructor();
    /**
     * Actualiza un avistamiento existente con los resultados de la IA.
     * Utiliza la Service Role Key (env.SUPABASE_KEY) para saltarse las políticas RLS
     * ya que el usuario normal no tiene permisos para actualizar las columnas de IA.
     */
    updateSightingWithAIResult(sightingId: string, result: IResultadoIdentificacion): Promise<ISighting>;
    /**
     * Retorna avistamientos dentro de un radio usando PostGIS ST_DWithin.
     * Delega el cálculo geoespacial a la función RPC `get_nearby_observations`.
     */
    getNearbySightings(lat: number, lng: number, radiusMeters: number): Promise<ISighting[]>;
    /**
     * Valida un avistamiento asignando una especie confirmada.
     * Solo especialistas/administradores pueden llamar este método (via RLS de Supabase).
     */
    validateSighting(sightingId: string, validatedSpeciesId: string, newStatus: 'validado' | 'en_revision'): Promise<ISighting>;
    private _mockSighting;
}
/**
 * Repositorio para la tabla `likes`.
 * Usa PRIMARY KEY compuesta (user_id, sighting_id) para garantizar
 * que cada usuario solo tenga un like por avistamiento.
 */
export declare class LikeRepository {
    private supabase;
    constructor();
    /** Agrega un like. Si ya existe, Supabase retorna error de PK duplicada (ignorado). */
    addLike(userId: string, sightingId: string): Promise<void>;
    /** Elimina un like de un usuario para un avistamiento específico. */
    removeLike(userId: string, sightingId: string): Promise<void>;
    /** Retorna la cantidad de likes de un avistamiento. */
    getLikeCount(sightingId: string): Promise<number>;
}
/**
 * Repositorio para la tabla `comments`.
 */
export declare class CommentRepository {
    private supabase;
    constructor();
    /** Inserta un nuevo comentario en un avistamiento. */
    addComment(userId: string, sightingId: string, content: string): Promise<IComment>;
    /**
     * Retorna todos los comentarios de un avistamiento.
     * Ordenados por fecha de creación ascendente (hilo cronológico).
     */
    getCommentsBySighting(sightingId: string): Promise<IComment[]>;
    /** Elimina un comentario. Solo el autor puede borrar el suyo (via RLS en Supabase). */
    deleteComment(commentId: string): Promise<void>;
}
export declare const sightingRepository: SightingRepository;
export declare const likeRepository: LikeRepository;
export declare const commentRepository: CommentRepository;
//# sourceMappingURL=ObservationRepository.d.ts.map