import exifr from 'exifr';
import { supabase, createAuthenticatedClient } from '../infrastructure/supabase.js';
import { AppError } from '../infrastructure/AppError.js';
import { env } from '../infrastructure/config.js';

interface SightingData {
  preliminary_species?: string | undefined;
  observed_at?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  gps_accuracy?: number | undefined;
}

export class SightingService {
  /**
   * Crea un avistamiento independiente (sin investigación).
   */
  static async createSighting(user: { id: string }, userToken: string, data: SightingData, file: Express.Multer.File) {
    const authClient = createAuthenticatedClient(userToken);
    const { preliminary_species, observed_at, latitude, longitude, gps_accuracy } = data;

    // 1. Validar tamaño
    const MAX_SIZE = env.MAX_IMAGE_SIZE_BYTES || 10485760; // 10MB default
    if (file.size > MAX_SIZE) {
      throw new AppError(`Foto demasiado grande (máx ${MAX_SIZE / 1024 / 1024}MB)`, 400);
    }

    // 2. Subir foto a Storage
    const fileExt = file.originalname.split('.').pop() || 'jpg';
    const filePath = `sightings/${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Asumimos que se usa el mismo bucket 'observaciones-media' o uno nuevo 'sightings'.
    // Para simplificar, usaremos 'observaciones-media' y la carpeta 'sightings/' si no existe el bucket.
    const { error: uploadErr } = await authClient.storage
      .from('observaciones-media')
      .upload(filePath, file.buffer, { contentType: file.mimetype });

    if (uploadErr) {
      throw new AppError(`Error al subir imagen: ${uploadErr.message}`, 500);
    }

    const { data: publicUrlData } = authClient.storage
      .from('observaciones-media')
      .getPublicUrl(filePath);
      
    const publicURL = publicUrlData.publicUrl;

    // 3. Extraer EXIF
    let exifData: any = {};
    try {
      exifData = await exifr.parse(file.buffer, { pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLongitude', 'GPSAccuracy'] });
    } catch (e) {
      console.warn('EXIF extraction failed or no EXIF data found');
    }

    // Definir observed_at
    let obsAt = observed_at ? new Date(observed_at) : null;
    if (!obsAt && exifData?.DateTimeOriginal) {
      obsAt = new Date(exifData.DateTimeOriginal);
    }
    if (!obsAt) obsAt = new Date(); // Fallback actual

    // Definir coordenadas
    let lat: number | null = typeof latitude !== 'undefined' ? latitude : null;
    let lng: number | null = typeof longitude !== 'undefined' ? longitude : null;
    let edited = false;

    if (lat === null && lng === null && exifData?.GPSLatitude && exifData?.GPSLongitude) {
      lat = exifData.latitude ?? null;
      lng = exifData.longitude ?? null;
    } else if (lat !== null && lng !== null) {
      edited = true; // Enviadas manualmente
    }

    // Preparar para PostGIS (WKT Geography)
    let geom = null;
    if (lat !== null && lng !== null) {
      geom = `SRID=4326;POINT(${lng} ${lat})`;
    }

    // 4. Insertar avistamiento
    const sighting = {
      user_id: user.id,
      photo_url: publicURL,
      preliminary_species: preliminary_species || null,
      observed_at: obsAt.toISOString(),
      decimal_latitude: lat,
      decimal_longitude: lng,
      geom,
      gps_accuracy: gps_accuracy || exifData?.GPSAccuracy || null,
      metadata_edited: edited,
      status: 'pending',
    };

    const { data: inserted, error: insertErr } = await authClient
      .from('sightings')
      .insert(sighting)
      .select('id')
      .single();

    if (insertErr) {
      throw new AppError(`Error al guardar avistamiento: ${insertErr.message}`, 500);
    }

    return { sighting_id: inserted.id, photo_url: publicURL };
  }

  static async getPendingSightings(userToken: string) {
    const authClient = createAuthenticatedClient(userToken);
    const { data, error } = await authClient
      .from('sightings')
      .select(`
        *,
        profiles:user_id(username, avatar_url)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
      
    if (error) throw new AppError(error.message, 500);
    return data;
  }

  static async validateSighting(sightingId: string, userToken: string, validatedSpeciesId: string) {
    const authClient = createAuthenticatedClient(userToken);
    
    // Verificar que la especie existe
    const { data: species, error: spError } = await authClient
      .from('species')
      .select('id')
      .eq('id', validatedSpeciesId)
      .single();
      
    if (spError || !species) throw new AppError('Especie no válida', 400);

    const updateData = {
      validated_species_id: validatedSpeciesId,
      status: 'validated',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await authClient
      .from('sightings')
      .update(updateData)
      .eq('id', sightingId)
      .select('*')
      .single();
      
    if (error) throw new AppError(error.message, 500);
    return data;
  }

  static async appealSighting(sightingId: string, userToken: string, notes?: string) {
    const authClient = createAuthenticatedClient(userToken);
    // Nota: notes podría guardarse en un log, actualmente solo se cambia el estado.
    const { data, error } = await authClient
      .from('sightings')
      .update({ status: 'in_review', updated_at: new Date().toISOString() })
      .eq('id', sightingId)
      .select('*')
      .single();
      
    if (error) throw new AppError(error.message, 500);
    return data;
  }

  static async getMySightings(userId: string, userToken: string) {
    const authClient = createAuthenticatedClient(userToken);
    const { data, error } = await authClient
      .from('sightings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw new AppError(error.message, 500);
    return data;
  }

  static async getSightingsFeed(userToken?: string) {
    const client = userToken ? createAuthenticatedClient(userToken) : supabase;
    const { data, error } = await client
      .from('sightings')
      .select(`
        *,
        profiles:user_id(username, avatar_url),
        species:validated_species_id(scientific_name, common_name)
      `)
      .order('created_at', { ascending: false });
      
    if (error) throw new AppError(error.message, 500);

    // Ocultar coordenadas si no hay token (invitado)
    if (!userToken) {
      return data.map((item: any) => ({
        ...item,
        decimal_latitude: null,
        decimal_longitude: null,
        geom: null
      }));
    }
    return data;
  }
}
