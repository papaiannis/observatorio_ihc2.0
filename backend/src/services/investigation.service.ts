import { supabase, createAuthenticatedClient } from '../infrastructure/supabase.js';
import { AppError } from '../infrastructure/AppError.js';

export class InvestigationService {
  /**
   * Obtiene todas las investigaciones activas.
   * Filtra por status = 'active' y end_date >= hoy.
   */
  static async getActiveInvestigations() {
    // end_date es tipo DATE en PostgreSQL, se compara solo con la parte de fecha (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('investigations')
      .select('id, title, description, start_date, end_date, survey_questions')
      .eq('status', 'active')
      .gte('end_date', today);

    if (error) {
      throw new AppError(`Error al obtener investigaciones: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Obtiene el detalle de una investigación por ID
   */
  static async getInvestigationById(id: string) {
    const { data, error } = await supabase
      .from('investigations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new AppError(`Investigación no encontrada: ${error.message}`, 404);
    }

    return data;
  }

  /**
   * Crea una nueva investigación (solo especialistas)
   */
  static async createInvestigation(userId: string, userToken: string, payload: any) {
    const authClient = createAuthenticatedClient(userToken);

    // Si viene como string WKT y queremos asegurar, o si es un JSON (GeoJSON)
    // Supabase y PostgREST permiten insertar GeoJSON directo en columnas geography/geometry
    let dataToInsert = { ...payload, created_by: userId };

    if (payload.area_geom && typeof payload.area_geom === 'object') {
      // Dejamos el objeto para que supabase-js (postgREST) lo convierta a JSON 
      // y luego la DB lo convierta a GeoJSON si es necesario.
      dataToInsert.area_geom = payload.area_geom;
    }

    const { data, error } = await authClient
      .from('investigations')
      .insert(dataToInsert)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      throw new AppError(`Error al crear la investigación: ${error.message}`, 500);
    }

    return data;
  }

  /**
   * Obtiene las investigaciones creadas por el usuario autenticado
   */
  static async getMyInvestigations(userId: string) {
    // No requiere token si usamos el client global porque userId viene validado, 
    // pero es buena práctica en un entorno multi-tenant. Lo haremos con supabase admin 
    // y filtraremos por created_by.
    const { data, error } = await supabase
      .from('investigations')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(`Error al listar investigaciones: ${error.message}`, 500);
    }

    return data || [];
  }

  /**
   * Actualiza una investigación. RLS asegurará que solo el creador pueda hacerlo.
   */
  static async updateInvestigation(id: string, userToken: string, payload: any) {
    const authClient = createAuthenticatedClient(userToken);

    const dataToUpdate = { ...payload, updated_at: new Date().toISOString() };

    const { data, error } = await authClient
      .from('investigations')
      .update(dataToUpdate)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new AppError(`Error al actualizar la investigación: ${error.message}`, 500);
    }

    if (!data) {
      throw new AppError(`Investigación no encontrada o no tienes permisos para actualizarla`, 404);
    }

    return data;
  }

  /**
   * Marca una investigación como "archived" (borrado lógico).
   * RLS asegurará que solo el creador pueda hacerlo.
   */
  static async deleteInvestigation(id: string, userToken: string) {
    const authClient = createAuthenticatedClient(userToken);

    const { data, error } = await authClient
      .from('investigations')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new AppError(`Error al eliminar la investigación: ${error.message}`, 500);
    }

    if (!data) {
      throw new AppError(`Investigación no encontrada o no tienes permisos para eliminarla`, 404);
    }

    return true;
  }

  /**
   * Obtiene las contribuciones de una investigación específica
   */
  static async getContributionsByInvestigation(investigationId: string, userToken?: string, filters?: { status?: string, limit?: number, offset?: number }) {
    const client = userToken ? createAuthenticatedClient(userToken) : supabase;
    let query = client
      .from('investigation_contributions')
      .select(`
        *,
        profiles:user_id(username, avatar_url),
        species:validated_species_id(scientific_name, common_name)
      `, { count: 'exact' })
      .eq('investigation_id', investigationId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('contribution_status', filters.status);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      const limit = filters.limit || 10;
      query = query.range(filters.offset, filters.offset + limit - 1);
    }

    const { data, error, count } = await query;
    if (error) {
      throw new AppError(`Error al obtener contribuciones: ${error.message}`, 500);
    }
    return { count, contributions: data };
  }
}
