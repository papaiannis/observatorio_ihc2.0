import { supabase } from '../infrastructure/supabase.js';
import { AppError } from '../infrastructure/AppError.js';

/**
 * Fila de datos tal como viene de Supabase antes del mapeo Darwin Core.
 */
interface RawContributionRow {
  id: string;
  observed_at: string;
  decimal_latitude: number | null;
  decimal_longitude: number | null;
  preliminary_species: string | null;
  created_at: string | null;
  profiles: { username: string | null } | null;
  species: {
    scientific_name: string | null;
    kingdom: string | null;
    phylum: string | null;
    class_column: string | null;
    order: string | null;
    family: string | null;
    genus: string | null;
  } | null;
}

/**
 * Registro mapeado al estándar Darwin Core (DwC).
 * Referencia: https://dwc.tdwg.org/terms/
 */
interface DarwinCoreRecord {
  'dwc:occurrenceID': string;
  'dwc:scientificName': string;
  'dwc:kingdom': string;
  'dwc:phylum': string;
  'dwc:class': string;
  'dwc:order': string;
  'dwc:family': string;
  'dwc:genus': string;
  'dwc:decimalLatitude': number | null;
  'dwc:decimalLongitude': number | null;
  'dwc:eventDate': string;
  'dwc:recordedBy': string;
  'dwc:occurrenceStatus': string;
  'dwc:basisOfRecord': string;
}

/**
 * Genera una cadena CSV válida a partir de un array de objetos.
 * Implementación nativa sin dependencias externas.
 * Escapa comillas dobles duplicándolas y envuelve valores con comas en comillas.
 */
function buildCsv(records: DarwinCoreRecord[]): string {
  if (records.length === 0) return '';

  const headers = Object.keys(records[0] || {}) as (keyof DarwinCoreRecord)[];
  const headerLine = headers.join(',');

  const rows = records.map(record => {
    return headers.map(header => {
      const value = record[header];
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Escapar comillas y envolver si contiene coma, comilla o salto de línea
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });

  return [headerLine, ...rows].join('\r\n');
}

/**
 * Exporta contribuciones validadas en formato Darwin Core (DwC) como CSV.
 * Filtrable por investigation_id para análisis por investigación específica.
 * @param investigationId - UUID de la investigación (opcional)
 * @returns String CSV con cabeceras DwC estándar
 */
export const exportDarwinCoreCSV = async (investigationId?: string): Promise<string> => {
  let query = supabase
    .from('investigation_contributions')
    .select(`
      id,
      observed_at,
      decimal_latitude,
      decimal_longitude,
      preliminary_species,
      created_at,
      profiles!investigation_contributions_user_id_fkey(username),
      species(
        scientific_name,
        common_name,
        kingdom,
        phylum,
        class_column,
        order,
        family,
        genus
      )
    `)
    .eq('contribution_status', 'validated')
    .order('observed_at', { ascending: true });

  if (investigationId) {
    query = query.eq('investigation_id', investigationId);
  }

  const { data, error } = await query;

  if (error) {
    throw new AppError(`Error al exportar datos: ${error.message}`, 500);
  }

  if (!data || data.length === 0) {
    // Devolver CSV con solo cabeceras si no hay datos
    return 'dwc:occurrenceID,dwc:scientificName,dwc:kingdom,dwc:phylum,dwc:class,dwc:order,dwc:family,dwc:genus,dwc:decimalLatitude,dwc:decimalLongitude,dwc:eventDate,dwc:recordedBy,dwc:occurrenceStatus,dwc:basisOfRecord';
  }

  const rows = (data as unknown as RawContributionRow[]);

  // Mapeo al estándar Darwin Core
  const mapped: DarwinCoreRecord[] = rows.map(row => ({
    'dwc:occurrenceID': row.id,
    'dwc:scientificName': row.species?.scientific_name ?? row.preliminary_species ?? 'Desconocida',
    'dwc:kingdom': row.species?.kingdom ?? '',
    'dwc:phylum': row.species?.phylum ?? '',
    'dwc:class': row.species?.class_column ?? '',
    'dwc:order': row.species?.order ?? '',
    'dwc:family': row.species?.family ?? '',
    'dwc:genus': row.species?.genus ?? '',
    'dwc:decimalLatitude': row.decimal_latitude,
    'dwc:decimalLongitude': row.decimal_longitude,
    'dwc:eventDate': row.observed_at,
    'dwc:recordedBy': row.profiles?.username ?? 'Anónimo',
    'dwc:occurrenceStatus': 'present',
    'dwc:basisOfRecord': 'HumanObservation',
  }));

  return buildCsv(mapped);
};
