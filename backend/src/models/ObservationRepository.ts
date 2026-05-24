import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../infrastructure/config';
import { AppError } from '../infrastructure/AppError';

// Definición de dominio
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
  accuracy?: number | undefined; // Capturado por el GPS del dispositivo
  imageUrl: string;
}

/**
 * Repositorio para guardar y consultar Observaciones de Vida Silvestre.
 * 
 * Cumple con la regla global: PostGIS como Estándar.
 * Utiliza llamadas RPC (Stored Procedures) a Supabase o SQL directo si se usa 'pg',
 * para evitar procesar ST_DWithin en el servidor Node.
 */
export class ObservationRepository {
  private supabase: SupabaseClient | null = null;

  constructor() {
    if (env.SUPABASE_URL && env.SUPABASE_KEY) {
      this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
    } else {
      console.warn("Supabase credentials not configured. ObservationRepository will mock responses.");
    }
  }

  /**
   * Guarda una observación en la base de datos usando PostGIS.
   * La validación estricta de variables (Zod) debe realizarse en el controller/service antes de llamar aquí.
   */
  async createObservation(data: IObservationInput): Promise<any> {
    if (!this.supabase) {
      // Mock para desarrollo sin BD
      return { id: 'mock-id-123', ...data };
    }

    // El objeto a guardar en Supabase.
    // Nota: para guardar GEOGRAPHY(Point, 4326), usualmente Supabase JS 
    // requiere usar una función RPC o usar la extensión PostGIS y formato WKT (Well-Known Text).
    const pointWkt = (data.latitude !== undefined && data.longitude !== undefined) 
      ? `POINT(${data.longitude} ${data.latitude})` 
      : null;

    const { data: result, error } = await this.supabase
      .from('observaciones')
      .insert({
        especie_principal: data.resultado.especie_principal.etiqueta,
        confianza: data.resultado.especie_principal.confianza,
        requiere_revision: data.resultado.requiere_revision_humana,
        gps_accuracy: data.accuracy,
        // Si tienes una columna `location` de tipo GEOGRAPHY(Point, 4326), supabase-js requiere que uses ST_GeomFromText o que pases el WKT dependiendo del setup, 
        // o mejor aún: usar un RPC.
        location: pointWkt,
        image_url: data.imageUrl,
        metadata: data.resultado // Guardar el resto en un JSONB
      })
      .select()
      .single();

    if (error) {
      throw new AppError(`Error insertando en Supabase: ${error.message}`, 500);
    }

    return result;
  }

  /**
   * Obtiene observaciones cercanas a una coordenada usando PostGIS nativo (ST_DWithin).
   * @param lat Latitud
   * @param lng Longitud
   * @param radiusMeters Radio de búsqueda en metros (ST_DWithin usa metros para Geography)
   */
  async getNearbyObservations(lat: number, lng: number, radiusMeters: number): Promise<any[]> {
    if (!this.supabase) return [];

    // Priorizando funciones nativas de PostGIS.
    // En Supabase, esto se logra mejor invocando una función SQL (Stored Procedure) previamente creada.
    const { data, error } = await this.supabase.rpc('get_nearby_observations', {
      lat,
      lng,
      radius_meters: radiusMeters
    });

    if (error) {
      throw new AppError(`Error ejecutando PostGIS ST_DWithin: ${error.message}`, 500);
    }

    return data;
  }
}

export const observationRepository = new ObservationRepository();
