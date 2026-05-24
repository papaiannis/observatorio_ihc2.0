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
export interface IObservationInput {
    resultado: IResultadoIdentificacion;
    latitude?: number | undefined;
    longitude?: number | undefined;
    accuracy?: number | undefined;
    imageUrl: string;
}
/**
 * Repositorio para guardar y consultar Observaciones de Vida Silvestre.
 *
 * Cumple con la regla global: PostGIS como Estándar.
 * Utiliza llamadas RPC (Stored Procedures) a Supabase o SQL directo si se usa 'pg',
 * para evitar procesar ST_DWithin en el servidor Node.
 */
export declare class ObservationRepository {
    private supabase;
    constructor();
    /**
     * Guarda una observación en la base de datos usando PostGIS.
     * La validación estricta de variables (Zod) debe realizarse en el controller/service antes de llamar aquí.
     */
    createObservation(data: IObservationInput): Promise<any>;
    /**
     * Obtiene observaciones cercanas a una coordenada usando PostGIS nativo (ST_DWithin).
     * @param lat Latitud
     * @param lng Longitud
     * @param radiusMeters Radio de búsqueda en metros (ST_DWithin usa metros para Geography)
     */
    getNearbyObservations(lat: number, lng: number, radiusMeters: number): Promise<any[]>;
}
export declare const observationRepository: ObservationRepository;
//# sourceMappingURL=ObservationRepository.d.ts.map