import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { authStore as auth } from '../utils/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihcobservatorio2-202625.onrender.com';

const C = {
  bg: '#F6F6F6',
  forest: '#1E2A21',
  earth: '#4A3F35',
  sage: '#9EB36D',
  white: '#FFFFFF',
  gray: '#A09D9A',
  border: '#E0E0E0',
  red: '#E57373',
  redBg: '#FFF0F0',
  placeholder: '#B0B0B0',
};

interface SightingFormProps {
  photoUri: string;
  photoTimestamp: number;
  onBack: () => void;
  onPublished: () => void;
}

export default function SightingFormScreen({
  photoUri,
  photoTimestamp,
  onBack,
  onPublished,
}: SightingFormProps) {
  const insets = useSafeAreaInsets();

  // Fecha y hora auto-rellenadas desde el timestamp de la foto
  const photoDate = new Date(photoTimestamp);
  const defaultDate = photoDate.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  const defaultTime = photoDate.toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [species, setSpecies] = useState('');
  const [question, setQuestion] = useState('');

  // Flags de edición para badge "Metadatos editados"
  const [dateEdited, setDateEdited] = useState(false);
  const [timeEdited, setTimeEdited] = useState(false);
  const [locationEdited, setLocationEdited] = useState(false);

  const metadataEdited = dateEdited || timeEdited || locationEdited;

  const [loadingLocation, setLoadingLocation] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // ── Auto-rellenar ubicación vía GPS ──────────────────────
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocation('Ubicación no disponible');
          setLoadingLocation(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude: lat, longitude: lng } = loc.coords;
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));

        // Geocodificación inversa para nombre legible
        const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geo) {
          const parts = [geo.district || geo.subregion, geo.city, geo.country].filter(Boolean);
          setLocation(parts.join(', '));
        } else {
          setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      } catch {
        setLocation('Ubicación no disponible');
      } finally {
        setLoadingLocation(false);
      }
    };
    fetchLocation();
  }, []);

  // ── Publicar avistamiento ─────────────────────────────────
  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);

    try {
      const { token } = await auth.getSession();
      if (!token) {
        Alert.alert('Sesión expirada', 'Por favor inicia sesión nuevamente.');
        setPublishing(false);
        return;
      }

      // Construir FormData
      const formData = new FormData();

      // Adjuntar la imagen
      const fileName = photoUri.split('/').pop() ?? 'photo.jpg';
      const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
      formData.append('file', { uri: photoUri, name: fileName, type: fileType } as any);

      // Campos opcionales
      if (species.trim()) formData.append('preliminary_species', species.trim());
      if (latitude && longitude) {
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
      }

      // Convertir fecha y hora a ISO 8601
      try {
        const [d, m, y] = date.split('/');
        const [h, min] = time.split(':');
        const iso = new Date(
          parseInt(`20${y}`), parseInt(m) - 1, parseInt(d),
          parseInt(h), parseInt(min)
        ).toISOString();
        formData.append('observed_at', iso);
      } catch { /* Si no se puede parsear, el backend usará la fecha actual */ }

      const res = await fetch(`${API_URL}/sightings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Error ${res.status}`);
      }

      Alert.alert('¡Publicado!', 'Tu avistamiento fue enviado para revisión.', [
        { text: 'OK', onPress: onPublished },
      ]);
    } catch (e: any) {
      Alert.alert('Error al publicar', e.message ?? 'Inténtalo nuevamente.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header propio del formulario ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.earth} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Formulario de registro</Text>

        {/* Badge de metadatos editados */}
        {metadataEdited && (
          <View style={styles.editedBadge}>
            <Text style={styles.editedBadgeText}>Metadatos editados</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Vista previa de la foto ── */}
          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
          </View>

          {/* ── Campos de Metadatos ── */}
          <View style={styles.fieldsCard}>

            {/* Fecha */}
            <View style={styles.fieldRow}>
              <Ionicons name="calendar-outline" size={18} color={C.sage} style={styles.fieldIcon} />
              <TextInput
                style={styles.fieldInput}
                value={date}
                onChangeText={(v) => { setDate(v); setDateEdited(v !== defaultDate); }}
                placeholder="dd/mm/aa"
                placeholderTextColor={C.placeholder}
              />
            </View>

            <View style={styles.fieldDivider} />

            {/* Hora */}
            <View style={styles.fieldRow}>
              <Ionicons name="time-outline" size={18} color={C.sage} style={styles.fieldIcon} />
              <TextInput
                style={styles.fieldInput}
                value={time}
                onChangeText={(v) => { setTime(v); setTimeEdited(v !== defaultTime); }}
                placeholder="hh:mm"
                placeholderTextColor={C.placeholder}
              />
            </View>

            <View style={styles.fieldDivider} />

            {/* Ubicación */}
            <View style={styles.fieldRow}>
              <Ionicons name="location-outline" size={18} color={C.sage} style={styles.fieldIcon} />
              {loadingLocation ? (
                <View style={styles.locationLoader}>
                  <ActivityIndicator size="small" color={C.sage} />
                  <Text style={styles.locationLoadingText}>Obteniendo ubicación...</Text>
                </View>
              ) : (
                <TextInput
                  style={[styles.fieldInput, styles.locationInput]}
                  value={location}
                  onChangeText={(v) => { setLocation(v); setLocationEdited(true); }}
                  placeholder="Ubicación"
                  placeholderTextColor={C.placeholder}
                  multiline
                />
              )}
            </View>
          </View>

          {/* ── Mapa con coordenadas ── */}
          {latitude && longitude ? (
            <View style={styles.mapCard}>
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map-outline" size={36} color={C.sage} />
                <View style={styles.mapCoordsBox}>
                  <Text style={styles.mapCoordLabel}>Latitud</Text>
                  <Text style={styles.mapCoordValue}>{latitude}</Text>
                </View>
                <View style={styles.mapCoordsDivider} />
                <View style={styles.mapCoordsBox}>
                  <Text style={styles.mapCoordLabel}>Longitud</Text>
                  <Text style={styles.mapCoordValue}>{longitude}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* ── Especie estimada ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Especie estimada</Text>
            <TextInput
              style={styles.speciesInput}
              value={species}
              onChangeText={setSpecies}
              placeholder="¿Qué crees que es?"
              placeholderTextColor={C.placeholder}
              returnKeyType="done"
            />
          </View>

          {/* ── Preguntas ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Preguntas</Text>
              <Text style={styles.charCount}>{question.length}/130</Text>
            </View>
            <TextInput
              style={styles.questionInput}
              value={question}
              onChangeText={(v) => setQuestion(v.slice(0, 130))}
              placeholder="Escribe tu pregunta acá..."
              placeholderTextColor={C.placeholder}
              multiline
              maxLength={130}
              textAlignVertical="top"
            />
          </View>

          {/* ── Botón Publicar ── */}
          <TouchableOpacity
            style={[styles.publishBtn, publishing && styles.publishBtnDisabled]}
            activeOpacity={0.85}
            onPress={handlePublish}
            disabled={publishing}
          >
            {publishing ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={styles.publishBtnText}>Publicar</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
    flexWrap: 'wrap',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    color: C.earth,
    flex: 1,
  },
  editedBadge: {
    backgroundColor: C.redBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.red,
  },
  editedBadgeText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    color: C.red,
  },

  // ── Scroll ──────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: {
    padding: 20,
    gap: 16,
  },

  // ── Foto previa ─────────────────────────────────────────
  photoPreviewContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  photoPreview: {
    width: '100%',
    height: 220,
    backgroundColor: C.border,
  },

  // ── Card de campos ──────────────────────────────────────
  fieldsCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  fieldIcon: {
    marginRight: 14,
  },
  fieldInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: C.earth,
  },
  locationInput: {
    minHeight: 40,
  },
  locationLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationLoadingText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.gray,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 18,
  },

  // ── Mapa ────────────────────────────────────────────────
  mapCard: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  mapPlaceholder: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    minHeight: 100,
  },
  mapCoordsBox: {
    alignItems: 'center',
  },
  mapCoordLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: C.gray,
    marginBottom: 2,
  },
  mapCoordValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: C.forest,
  },
  mapCoordsDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.border,
  },

  // ── Secciones ───────────────────────────────────────────
  sectionCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: C.forest,
    marginBottom: 12,
  },
  charCount: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.gray,
  },
  speciesInput: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: C.earth,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 6,
  },
  questionInput: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.earth,
    minHeight: 80,
    lineHeight: 22,
  },

  // ── Botón Publicar ──────────────────────────────────────
  publishBtn: {
    backgroundColor: C.earth,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: C.earth,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    color: C.white,
    letterSpacing: 0.5,
  },
});
