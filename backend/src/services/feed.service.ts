import { supabase } from '../infrastructure/supabase.js';
import { AppError } from '../infrastructure/AppError.js';

export interface FeedItem {
  id: string;
  photo_url: string | null;
  preliminary_species: string | null;
  validated_species_id: string | null;
  observed_at: string;
  decimal_latitude: number | null;
  decimal_longitude: number | null;
  created_at: string | null;
  contribution_status: string;
  investigation_id: string;
  profiles: { username: string | null; avatar_url: string | null } | null;
}

/**
 * Obtiene el feed de avistamientos validados y pendientes.
 * Si el usuario no está autenticado (isGuest=true), se ocultan
 * las coordenadas exactas (decimal_latitude y decimal_longitude → null)
 * para proteger la privacidad del bioma.
 * @param isGuest - True si la petición proviene de un usuario no autenticado
 */
export const getFeed = async (isGuest: boolean): Promise<FeedItem[]> => {
    const { data, error } = await supabase
      .from('investigation_contributions')
      .select(`
        id,
        photo_url,
        preliminary_species,
        validated_species_id,
        observed_at,
        decimal_latitude,
        decimal_longitude,
        created_at,
        contribution_status,
        investigation_id,
        profiles!investigation_contributions_user_id_fkey (username, avatar_url),
        species (scientific_name, common_name),
        validator:profiles!investigation_contributions_rated_by_fkey (username, avatar_url, role)
      `)
      .in('contribution_status', ['validated', 'pending', 'in_review'])
      .order('created_at', { ascending: false })
      .limit(100);

  if (error) {
    throw new AppError(`Error al obtener el feed: ${error.message}`, 500);
  }

  const items = (data ?? []) as unknown as FeedItem[];

  // Política de privacidad del bioma: los invitados no ven coordenadas exactas
  if (isGuest) {
    return items.map(item => ({
      ...item,
      decimal_latitude: null,
      decimal_longitude: null,
    }));
  }

  return items;
};

/**
 * Obtiene únicamente los avistamientos validados (para el Observatorio científico).
 * Aplica la misma política de privacidad de coordenadas para invitados.
 * @param isGuest - True si la petición proviene de un usuario no autenticado
 */
export const getObservatory = async (isGuest: boolean): Promise<FeedItem[]> => {
    const { data, error } = await supabase
      .from('investigation_contributions')
      .select(`
        id,
        photo_url,
        preliminary_species,
        validated_species_id,
        observed_at,
        decimal_latitude,
        decimal_longitude,
        created_at,
        contribution_status,
        investigation_id,
        profiles (username, avatar_url),
        species (scientific_name, common_name)
      `)
      .eq('contribution_status', 'validated')
      .order('created_at', { ascending: false })
      .limit(200);

  if (error) {
    throw new AppError(`Error al obtener el observatorio: ${error.message}`, 500);
  }

  const items = (data ?? []) as unknown as FeedItem[];

  if (isGuest) {
    return items.map(item => ({
      ...item,
      decimal_latitude: null,
      decimal_longitude: null,
    }));
  }

  return items;
};
