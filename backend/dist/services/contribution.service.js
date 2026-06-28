import exifr from 'exifr';
import { createAuthenticatedClient } from '../infrastructure/supabase.js';
import { AppError } from '../infrastructure/AppError.js';
import { env } from '../infrastructure/config.js';
export class ContributionService {
    /**
     * Crea una contribución para una investigación activa.
     * @param user - Usuario autenticado (id, email)
     * @param userToken - JWT del usuario para autenticar operaciones RLS en Supabase
     * @param data - Datos del formulario de la contribución
     * @param file - Archivo de imagen subido
     */
    static async createContribution(user, userToken, data, file) {
        // Cliente autenticado con el token del usuario para respetar las políticas RLS
        const authClient = createAuthenticatedClient(userToken);
        const { investigation_id, preliminary_species, survey_answers, observed_at, latitude, longitude, gps_accuracy } = data;
        // 1. Validar tamaño (ej: máximo 5MB o el del env)
        const MAX_SIZE = env.MAX_IMAGE_SIZE_BYTES || 10485760; // 10MB default
        if (file.size > MAX_SIZE) {
            throw new AppError(`Foto demasiado grande (máx ${MAX_SIZE / 1024 / 1024}MB)`, 400);
        }
        // 2. Verificar que la investigación existe y está activa (usando authClient para contexto RLS)
        const { data: inv, error: invErr } = await authClient
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
        // 4. Extraer EXIF
        let exifData = {};
        try {
            exifData = await exifr.parse(file.buffer, { pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLongitude', 'GPSAccuracy'] });
        }
        catch (e) {
            console.warn('EXIF extraction failed or no EXIF data found');
        }
        // Definir observed_at
        let obsAt = observed_at ? new Date(observed_at) : null;
        if (!obsAt && exifData?.DateTimeOriginal) {
            obsAt = new Date(exifData.DateTimeOriginal);
        }
        if (!obsAt)
            obsAt = new Date(); // Fallback actual
        // Definir coordenadas
        let lat = typeof latitude !== 'undefined' ? latitude : null;
        let lng = typeof longitude !== 'undefined' ? longitude : null;
        let edited = false;
        if (lat === null && lng === null && exifData?.GPSLatitude && exifData?.GPSLongitude) {
            lat = exifData.latitude ?? null;
            lng = exifData.longitude ?? null;
            // exifr automatically parses lat/lon into decimal if we just call exifr.gps(file) but parse also maps it.
            // exifr.parse usually returns latitude and longitude as decimals directly.
        }
        else if (lat !== null && lng !== null) {
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
        const { data: inserted, error: insertErr } = await authClient
            .from('investigation_contributions')
            .insert(contribution)
            .select('id')
            .single();
        if (insertErr) {
            throw new AppError(`Error al guardar contribución: ${insertErr.message}`, 500);
        }
        // 6. Suscribir al usuario a la investigación si no lo está
        const { data: sub } = await authClient
            .from('investigation_subscriptions')
            .select('investigation_id')
            .eq('investigation_id', investigation_id)
            .eq('user_id', user.id)
            .maybeSingle();
        if (!sub) {
            await authClient
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
//# sourceMappingURL=contribution.service.js.map