import exifr from 'exifr';
import { supabase, createAuthenticatedClient } from '../infrastructure/supabase.js';
import { AppError } from '../infrastructure/AppError.js';
import { env } from '../infrastructure/config.js';
import { sendPushAndCreateNotification } from './notification.service.js';

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
    const { data: sightingsData, error } = await authClient
      .from('sightings')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw new AppError(error.message, 500);

    const userIds = new Set<string>();
    sightingsData.forEach(item => {
      if (item.user_id) userIds.add(item.user_id);
    });

    let profilesMap: Record<string, any> = {};
    if (userIds.size > 0) {
      const { data: profilesData } = await authClient
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', Array.from(userIds));
        
      if (profilesData) {
        profilesData.forEach(p => {
          profilesMap[p.id] = p;
        });
      }
    }

    return sightingsData.map(item => ({
      ...item,
      profiles: profilesMap[item.user_id] ? { username: profilesMap[item.user_id].username, avatar_url: profilesMap[item.user_id].avatar_url } : null
    }));
  }

  static async validateSighting(
    sightingId: string,
    userToken: string,
    validatedSpeciesId: string,
    specialistId?: string
  ) {
    const authClient = createAuthenticatedClient(userToken);

    // Verificar que la especie existe y obtener sus nombres para la notificación
    const { data: species, error: spError } = await authClient
      .from('species')
      .select('id, scientific_name, common_name')
      .eq('id', validatedSpeciesId)
      .single();

    if (spError || !species) throw new AppError('Especie no válida', 400);

    const updateData: any = {
      validated_species_id: validatedSpeciesId,
      status: 'validated',
      // Guardamos el especialista en rated_by/rated_at directamente en la tabla
      // Esto es más confiable que el trigger SECURITY DEFINER (auth.uid() puede ser NULL en triggers)
      ...(specialistId ? { rated_by: specialistId, rated_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await authClient
      .from('sightings')
      .update(updateData)
      .eq('id', sightingId)
      .select('*')
      .maybeSingle();

    if (error) throw new AppError(error.message, 500);
    if (!data) throw new AppError('No se pudo actualizar el avistamiento. Es posible que las políticas de seguridad (RLS) hayan bloqueado la acción (por ejemplo, si tu rol no está escrito exactamente como "Especialista").', 403);

    if (data && data.user_id) {
      const speciesName = species.scientific_name || species.common_name || data.preliminary_species || 'Especie identificada';
      await sendPushAndCreateNotification(
        data.user_id,
        '¡Tu avistamiento fue validado!',
        `La comunidad científica validó tu observación como "${speciesName}". ¡Gracias por tu valioso aporte!`,
        data.id,
      );
    }

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

    if (data && data.user_id) {
      await sendPushAndCreateNotification(
        data.user_id,
        'Apelación en revisión',
        'Tu apelación ha sido recibida. Un equipo de especialistas revisará nuevamente la identificación de tu avistamiento.',
        data.id,
      );
    }

    return data;
  }

  /**
   * Devuelve un avistamiento junto con quién lo validó (si aplica).
   * Solo accesible por el dueño del avistamiento.
   * Usa rated_by para obtener el perfil del validador directamente (más confiable que curation_logs).
   */
  static async getSightingById(sightingId: string, userId: string, userToken: string) {
    const authClient = createAuthenticatedClient(userToken);

    const { data: sighting, error } = await authClient
      .from('sightings')
      .select(`
        *,
        species (scientific_name, common_name)
      `)
      .eq('id', sightingId)
      .single();

    if (error || !sighting) throw new AppError('Avistamiento no encontrado', 404);
    if (sighting.user_id !== userId) {
      throw new AppError('No tienes permiso para ver este avistamiento', 403);
    }

    let validator = null;
    if (sighting.status === 'validated' && sighting.rated_by) {
      const { data: valProfile } = await authClient
        .from('profiles')
        .select('username, avatar_url, role')
        .eq('id', sighting.rated_by)
        .maybeSingle();

      if (valProfile?.username) {
        validator = {
          username: valProfile.username,
          avatar_url: valProfile.avatar_url,
          role: valProfile.role,
        };
      }
    }

    let profiles = null;
    if (sighting.user_id) {
      const { data: userProfile } = await authClient
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', sighting.user_id)
        .maybeSingle();

      if (userProfile) {
        profiles = userProfile;
      }
    }

    const result = { ...sighting, validator, profiles };
    return result;
  }

  static async getMySightings(userId: string, userToken: string) {
    const authClient = createAuthenticatedClient(userToken);
    const { data, error } = await authClient
      .from('sightings')
      .select('*, species (scientific_name, common_name)')
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
        species (scientific_name, common_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw new AppError(error.message, 500);

    const items = data || [];
    const userIds = new Set<string>();
    items.forEach((item: any) => {
      if (item.user_id) userIds.add(item.user_id);
      if (item.rated_by) userIds.add(item.rated_by);
    });

    const profilesMap = new Map<string, any>();
    if (userIds.size > 0) {
      const { data: profilesData } = await client
        .from('profiles')
        .select('id, username, avatar_url, role')
        .in('id', Array.from(userIds));

      (profilesData || []).forEach((p: any) => {
        profilesMap.set(p.id, p);
      });
    }

    const formattedData = items.map((item: any) => {
      const userProfile = item.user_id ? profilesMap.get(item.user_id) : null;
      const valProfile = item.rated_by ? profilesMap.get(item.rated_by) : null;

      const validator = (item.status === 'validated' && valProfile?.username)
        ? {
          username: valProfile.username,
          avatar_url: valProfile.avatar_url,
          role: valProfile.role,
        }
        : null;

      const profiles = userProfile ? {
        username: userProfile.username,
        avatar_url: userProfile.avatar_url,
      } : null;

      const res = { ...item, validator, profiles };

      if (!userToken) {
        res.decimal_latitude = null;
        res.decimal_longitude = null;
        res.geom = null;
      }
      return res;
    });

    return formattedData;
  }

  static async deleteSighting(sightingId: string, userId: string, userToken: string) {
    const authClient = createAuthenticatedClient(userToken);

    // Primero, verificamos que el avistamiento pertenezca al usuario 
    // (o confiar en las políticas RLS si están bien configuradas)
    const { data: sighting, error: fetchErr } = await authClient
      .from('sightings')
      .select('user_id, photo_url')
      .eq('id', sightingId)
      .single();

    if (fetchErr || !sighting) {
      throw new AppError('Avistamiento no encontrado', 404);
    }

    if (sighting.user_id !== userId) {
      // Alternativamente, aquí se podría comprobar si el usuario es Admin o Especialista
      throw new AppError('No tienes permiso para eliminar este avistamiento', 403);
    }

    // (Opcional) Eliminar la foto del Storage
    // Extraer el path del URL (esto es básico, depende del formato exacto de publicUrl)
    // const pathRegex = /observaciones-media\/(.+)$/;
    // const match = sighting.photo_url.match(pathRegex);
    // if (match && match[1]) {
    //   await authClient.storage.from('observaciones-media').remove([match[1]]);
    // }

    // Eliminar el registro en BD
    const { error: deleteErr } = await authClient
      .from('sightings')
      .delete()
      .eq('id', sightingId);

    if (deleteErr) {
      throw new AppError(`Error al eliminar: ${deleteErr.message}`, 500);
    }

    return { success: true, message: 'Avistamiento eliminado' };
  }
}
