import { supabase } from '../infrastructure/supabase.js';
import { AppError } from '../infrastructure/AppError.js';

export interface SpeciesResult {
  id: string;
  scientific_name: string;
  common_name: string | null;
  kingdom: string | null;
  family: string | null;
}

/**
 * Busca especies por nombre científico o nombre común.
 * Usa ilike para búsqueda case-insensitive en ambos campos.
 * @param query - Término de búsqueda (mínimo 2 caracteres)
 * @returns Lista de especies que coinciden (máximo 20)
 */
export const searchSpecies = async (query: string): Promise<SpeciesResult[]> => {
  if (!query || query.trim().length < 2) {
    throw new AppError('El término de búsqueda debe tener al menos 2 caracteres.', 400);
  }

  const sanitized = query.trim();

  const { data, error } = await supabase
    .from('species')
    .select('id, scientific_name, common_name, kingdom, family')
    .or(`scientific_name.ilike.%${sanitized}%,common_name.ilike.%${sanitized}%`)
    .order('scientific_name', { ascending: true })
    .limit(20);

  if (error) {
    throw new AppError(`Error al buscar especies: ${error.message}`, 500);
  }

  return data ?? [];
};
