import exifr from 'exifr';
import { supabase } from '../infrastructure/supabase.js';
import { AppError } from '../infrastructure/AppError.js';
import { env } from '../infrastructure/config.js';

interface ContributionData {
  investigation_id: string;
  preliminary_species?: string | undefined;
  survey_answers?: string | undefined;
  observed_at?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  gps_accuracy?: number | undefined;
}

export class ContributionService {
  static async createContribution(user: { id: string }, data: ContributionData, file: Express.Multer.File) {
    const { investigation_id, preliminary_species, survey_answers, observed_at, latitude, longitude, gps_accuracy } = data;

    // 1. Validar tamaño (ej: máximo 5MB o el del env)
    const MAX_SIZE = env.MAX_IMAGE_SIZE_BYTES || 10485760; // 10MB default
    if (file.size > MAX_SIZE) {
      throw new AppError(`Foto demasiado grande (máx ${MAX_SIZE / 1024 / 1024}MB)`, 400);
    }

    // 2. Verificar que la investigación existe y está activa
    const { data: inv, error: invErr } = await supabase
      .from('investigations')
      .select('id, status')
      .eq('id', investigation_id)
      .eq('status', 'active')
      .single();

    if (invErr || !inv) {
      throw new AppError('Investigación no encontrada o inactiva', 404);
    }

    // 3. Subir foto a Storage
    const fileExt = file.originalname.split('.').pop() || 'jpg';
    const filePath = `contributions/${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadErr } = await supabase.storage
      .from('contributions')
      .upload(filePath, file.buffer, { contentType: file.mimetype });

    if (uploadErr) {
      throw new AppError(`Error al subir imagen: ${uploadErr.message}`, 500);
    }

    const { data: publicUrlData } = supabase.storage
      .from('contributions')
      .getPublicUrl(filePath);
      
    const publicURL = publicUrlData.publicUrl;

    // 4. Extraer EXIF
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
      
      // exifr automatically parses lat/lon into decimal if we just call exifr.gps(file) but parse also maps it.
      // exifr.parse usually returns latitude and longitude as decimals directly.
    } else if (lat !== null && lng !== null) {
      edited = true; // Enviadas manualmente
    }

    // Preparar para PostGIS (WKT Geography)
    let geom = null;
    if (lat !== null && lng !== null) {
      geom = `SRID=4326;POINT(${lng} ${lat})`;
    }

    // 5. Insertar contribución
    const contribution = {
      investigation_id,
      user_id: user.id,
      photo_url: publicURL,
      preliminary_species: preliminary_species || null,
      survey_answers: survey_answers ? JSON.parse(survey_answers) : null,
      observed_at: obsAt.toISOString(),
      decimal_latitude: lat,
      decimal_longitude: lng,
      geom, // PostGIS maneja WKT casteado automáticamente si la columna es geometry/geography en supabase-js
      gps_accuracy: gps_accuracy || exifData?.GPSAccuracy || null,
      metadata_edited: edited,
      contribution_status: 'pending',
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('investigation_contributions')
      .insert(contribution)
      .select('id')
      .single();

    if (insertErr) {
      throw new AppError(`Error al guardar contribución: ${insertErr.message}`, 500);
    }

    // 6. Suscribir al usuario a la investigación si no lo está
    const { data: sub } = await supabase
      .from('investigation_subscriptions')
      .select('investigation_id')
      .eq('investigation_id', investigation_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sub) {
      await supabase
        .from('investigation_subscriptions')
        .insert({ 
          investigation_id, 
          user_id: user.id, 
          subscribed_at: new Date().toISOString() 
        });
    }

    return { contribution_id: inserted.id, photo_url: publicURL };
  }
}
