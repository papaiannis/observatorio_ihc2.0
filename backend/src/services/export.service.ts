import * as XLSX from 'xlsx';
import { supabase, createAuthenticatedClient } from '../infrastructure/supabase.js';
import { AppError } from '../infrastructure/AppError.js';

interface RawContributionRow {
  id: string;
  observed_at: string;
  decimal_latitude: number | null;
  decimal_longitude: number | null;
  preliminary_species: string | null;
  created_at: string | null;
  contribution_status?: string | null;
  photo_url?: string | null;
  survey_answers?: any | null;
  investigation_id?: string | null;
  profiles: { username: string | null } | null;
  species: {
    scientific_name: string | null;
    common_name?: string | null;
    kingdom: string | null;
    phylum: string | null;
    class_column: string | null;
    order: string | null;
    family: string | null;
    genus: string | null;
  } | null;
}

interface RawSightingRow {
  id: string;
  observed_at: string;
  decimal_latitude: number | null;
  decimal_longitude: number | null;
  preliminary_species: string | null;
  created_at: string | null;
  status?: string | null;
  photo_url?: string | null;
  user_id?: string | null;
  profiles?: { username: string | null } | null;
  species?: {
    scientific_name: string | null;
    common_name?: string | null;
    kingdom?: string | null;
    phylum?: string | null;
    class_column?: string | null;
    order?: string | null;
    family?: string | null;
    genus?: string | null;
  } | null;
}

interface DarwinCoreRecord {
  'dwc:occurrenceID': string;
  'dwc:scientificName': string;
  'dwc:vernacularName': string;
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
  'enu:status': string;
  'enu:photoUrl': string;
  'enu:projectId'?: string | undefined;
  'enu:surveyAnswers'?: string | undefined;
}

function buildCsv(records: any[]): string {
  if (records.length === 0) return '';

  const headers = Object.keys(records[0] || {});
  const headerLine = headers.join(',');

  const rows = records.map(record => {
    return headers.map(header => {
      const value = record[header];
      if (value === null || value === undefined) return '';
      const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });

  return [headerLine, ...rows].join('\r\n');
}

function buildXlsx(records: any[], sheetName: string = 'Dataset ENÚ'): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(records);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export async function exportDarwinCoreCSV(investigationId?: string): Promise<string> {
  const result = await exportProjectSightings(investigationId || '', 'csv', true);
  return result as string;
}

export async function exportProjectSightings(
  investigationId: string,
  format: 'csv' | 'xlsx' = 'csv',
  onlyValidated: boolean = false,
  userToken?: string
): Promise<string | Buffer> {
  const client = userToken ? createAuthenticatedClient(userToken) : supabase;

  let query = client
    .from('investigation_contributions')
    .select(`
      id,
      observed_at,
      decimal_latitude,
      decimal_longitude,
      preliminary_species,
      created_at,
      contribution_status,
      photo_url,
      survey_answers,
      investigation_id,
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
    .order('observed_at', { ascending: true });

  if (investigationId) {
    query = query.eq('investigation_id', investigationId);
  }
  if (onlyValidated) {
    query = query.eq('contribution_status', 'validated');
  }

  const { data, error } = await query;

  if (error) {
    throw new AppError(`Error al exportar datos del proyecto: ${error.message}`, 500);
  }

  const rows = (data || []) as unknown as RawContributionRow[];

  const mapped: DarwinCoreRecord[] = rows.map(row => ({
    'dwc:occurrenceID': row.id,
    'dwc:scientificName': row.species?.scientific_name ?? row.preliminary_species ?? 'Desconocida',
    'dwc:vernacularName': row.species?.common_name ?? '',
    'dwc:kingdom': row.species?.kingdom ?? '',
    'dwc:phylum': row.species?.phylum ?? '',
    'dwc:class': row.species?.class_column ?? '',
    'dwc:order': row.species?.order ?? '',
    'dwc:family': row.species?.family ?? '',
    'dwc:genus': row.species?.genus ?? '',
    'dwc:decimalLatitude': row.decimal_latitude,
    'dwc:decimalLongitude': row.decimal_longitude,
    'dwc:eventDate': row.observed_at || row.created_at || '',
    'dwc:recordedBy': row.profiles?.username ?? 'Anónimo',
    'dwc:occurrenceStatus': 'present',
    'dwc:basisOfRecord': 'HumanObservation',
    'enu:status': row.contribution_status || 'pending',
    'enu:photoUrl': row.photo_url || '',
    'enu:projectId': row.investigation_id || undefined,
    'enu:surveyAnswers': row.survey_answers ? JSON.stringify(row.survey_answers) : '',
  }));

  if (format === 'xlsx') {
    return buildXlsx(mapped, 'Proyecto_ENÚ');
  }
  return buildCsv(mapped);
}

export async function exportSingleSighting(
  sightingId: string,
  format: 'csv' | 'xlsx' = 'csv',
  userToken?: string
): Promise<string | Buffer> {
  const client = userToken ? createAuthenticatedClient(userToken) : supabase;

  const { data, error } = await client
    .from('sightings')
    .select(`
      id,
      user_id,
      observed_at,
      decimal_latitude,
      decimal_longitude,
      preliminary_species,
      created_at,
      status,
      photo_url,
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
    .eq('id', sightingId)
    .single();

  if (error || !data) {
    throw new AppError(`Error al exportar avistamiento individual: ${error?.message || 'No encontrado'}`, 404);
  }

  const row = data as unknown as RawSightingRow;
  if (row.user_id) {
    const { data: userProfile } = await client
      .from('profiles')
      .select('username')
      .eq('id', row.user_id)
      .maybeSingle();
    if (userProfile) {
      row.profiles = { username: userProfile.username };
    }
  }

  const mapped: any[] = [{
    'dwc:occurrenceID': row.id,
    'dwc:scientificName': row.species?.scientific_name ?? row.preliminary_species ?? 'Desconocida',
    'dwc:vernacularName': row.species?.common_name ?? '',
    'dwc:kingdom': row.species?.kingdom ?? '',
    'dwc:phylum': row.species?.phylum ?? '',
    'dwc:class': row.species?.class_column ?? '',
    'dwc:order': row.species?.order ?? '',
    'dwc:family': row.species?.family ?? '',
    'dwc:genus': row.species?.genus ?? '',
    'dwc:decimalLatitude': row.decimal_latitude,
    'dwc:decimalLongitude': row.decimal_longitude,
    'dwc:geodeticDatum': 'EPSG:4326',
    'dwc:eventDate': row.observed_at ? new Date(row.observed_at).toISOString() : undefined,
    'dwc:country': 'Venezuela',
    'dwc:stateProvince': 'Bolívar',
    'dwc:recordedBy': row.profiles?.username ?? 'Anónimo',
    'dwc:basisOfRecord': 'HumanObservation',
    'dwc:identificationVerificationStatus': row.status === 'validated' ? 'Validated' : 'Unverified',
    'dwc:associatedMedia': row.photo_url ?? undefined,
  }];

  if (format === 'xlsx') {
    return buildXlsx(mapped, 'Avistamiento_ENÚ');
  }
  return buildCsv(mapped);
}

export async function exportMySightings(
  userId: string,
  format: 'csv' | 'xlsx' = 'csv',
  userToken?: string
): Promise<string | Buffer> {
  const client = userToken ? createAuthenticatedClient(userToken) : supabase;

  const { data, error } = await client
    .from('sightings')
    .select(`
      id,
      user_id,
      observed_at,
      decimal_latitude,
      decimal_longitude,
      preliminary_species,
      created_at,
      status,
      photo_url,
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
    .eq('user_id', userId)
    .order('observed_at', { ascending: false });

  if (error) {
    throw new AppError(`Error al exportar avistamientos del usuario: ${error.message}`, 500);
  }

  const rows = (data || []) as unknown as RawSightingRow[];
  const userIds = new Set<string>();
  rows.forEach(r => {
    if (r.user_id) userIds.add(r.user_id);
  });

  if (userIds.size > 0) {
    const { data: profilesData } = await client
      .from('profiles')
      .select('id, username')
      .in('id', Array.from(userIds));

    const pMap = new Map<string, string | null>();
    (profilesData || []).forEach((p: any) => pMap.set(p.id, p.username));

    rows.forEach(r => {
      if (r.user_id && pMap.has(r.user_id)) {
        r.profiles = { username: pMap.get(r.user_id) ?? null };
      }
    });
  }

  const mapped: any[] = rows.map(row => ({
    'dwc:occurrenceID': row.id,
    'dwc:scientificName': row.species?.scientific_name ?? row.preliminary_species ?? 'Desconocida',
    'dwc:vernacularName': row.species?.common_name ?? '',
    'dwc:kingdom': row.species?.kingdom ?? '',
    'dwc:phylum': row.species?.phylum ?? '',
    'dwc:class': row.species?.class_column ?? '',
    'dwc:order': row.species?.order ?? '',
    'dwc:family': row.species?.family ?? '',
    'dwc:genus': row.species?.genus ?? '',
    'dwc:decimalLatitude': row.decimal_latitude,
    'dwc:decimalLongitude': row.decimal_longitude,
    'dwc:geodeticDatum': 'EPSG:4326',
    'dwc:eventDate': row.observed_at ? new Date(row.observed_at).toISOString() : undefined,
    'dwc:country': 'Venezuela',
    'dwc:stateProvince': 'Bolívar',
    'dwc:recordedBy': row.profiles?.username ?? 'Anónimo',
    'dwc:basisOfRecord': 'HumanObservation',
    'dwc:identificationVerificationStatus': row.status === 'validated' ? 'Validated' : 'Unverified',
    'dwc:associatedMedia': row.photo_url ?? undefined,
  }));

  if (format === 'xlsx') {
    return buildXlsx(mapped, 'Mis_Avistamientos_ENÚ');
  }
  return buildCsv(mapped);
}
