import { supabase } from '../infrastructure/supabase.js';
import { AppError } from '../infrastructure/AppError.js';

export class InvestigationService {
  /**
   * Obtiene todas las investigaciones activas.
   * Filtra por status = 'active' y end_date >= hoy.
   */
  static async getActiveInvestigations() {
    const today = new Date().toISOString();
    
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
}
