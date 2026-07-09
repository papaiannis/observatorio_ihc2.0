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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { WebView } from 'react-native-webview';
import { authStore as auth } from '../utils/authStore';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihcobservatorio2-202625.onrender.com';

// ── Paleta Ajustada al Diseño ─────────────────────────
const C = {
  sage: '#9EB36D',
  earth: '#4A3F35',
  avatarBg: '#FCECDA',
  white: '#FFFFFF',
  gray: '#A09D9A',
  border: '#A09D9A',
  red: '#D14343',
  redBg: '#FFF0F0',
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

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  // ── Lógica de Fecha y Hora (Auto-rellenada) ───────────────
  const photoDate = new Date(photoTimestamp || Date.now());
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
  const [species, setSpecies] = useState('');
  const [question, setQuestion] = useState('');

  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');

  // ── Banderas para "Metadatos editados" ────────────────────
  const [dateEdited, setDateEdited] = useState(false);
  const [timeEdited, setTimeEdited] = useState(false);
  const [locationEdited, setLocationEdited] = useState(false);

  const metadataEdited = dateEdited || timeEdited || locationEdited;

  const [loadingLocation, setLoadingLocation] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // ── Obtener GPS automáticamente ───────────────────────────
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

        // Geocodificación inversa
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

  // ── Lógica de Publicación ─────────────────────────────────
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

      const formData = new FormData();
      const fileName = photoUri.split('/').pop() ?? 'photo.jpg';
      const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
      formData.append('file', { uri: photoUri, name: fileName, type: fileType } as any);

      if (species.trim()) formData.append('preliminary_species', species.trim());
      if (latitude && longitude) {
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
      }

      if (metadataEdited) {
        formData.append('metadata_edited', 'true');
      }

      const res = await fetch(`${API_URL}/api/v1/sightings`, {
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

  if (!fontsLoaded) return null;

  return (
    <View style={styles.root}>
      {/* ── BARRA SUPERIOR VERDE ── */}
      <View style={[styles.topHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.avatarContainer} activeOpacity={0.8}>
          <Ionicons name="person" size={20} color={C.earth} />
        </TouchableOpacity>

        <View style={styles.topHeaderRight}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="search-outline" size={24} color={C.earth} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="add" size={30} color={C.earth} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── CONTENEDOR PRINCIPAL BLANCO ── */}
      <KeyboardAvoidingView
        style={styles.mainCard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Cabecera del Formulario ── */}
          <View style={styles.formHeaderRow}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={C.earth} />
            </TouchableOpacity>
            <Text style={styles.formTitle}>Formulario de registro</Text>
          </View>

          {/* Etiqueta de Metadatos */}
          {metadataEdited && (
            <View style={styles.badgeWrapper}>
              <View style={styles.editedBadge}>
                <Text style={styles.editedBadgeText}>Metadatos editados</Text>
              </View>
            </View>
          )}

          {/* ── Campos de Entrada (Fecha, Hora, Ubicación) ── */}
          <View style={styles.inputsSection}>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.inputField}
                value={date}
                onChangeText={(v) => { setDate(v); setDateEdited(v !== defaultDate); }}
                placeholder="01/01/00"
                placeholderTextColor={C.gray}
              />
              <Ionicons name="chevron-down" size={16} color={C.earth} />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.inputField}
                value={time}
                onChangeText={(v) => { setTime(v); setTimeEdited(v !== defaultTime); }}
                placeholder="Hora"
                placeholderTextColor={C.gray}
              />
              <Ionicons name="chevron-down" size={16} color={C.earth} />
            </View>

            <View style={styles.inputContainer}>
              {loadingLocation ? (
                <ActivityIndicator size="small" color={C.earth} style={{ flex: 1, alignItems: 'flex-start' }} />
              ) : (
                <TextInput
                  style={styles.inputField}
                  value={location}
                  onChangeText={(v) => { setLocation(v); setLocationEdited(true); }}
                  placeholder="Ubicación"
                  placeholderTextColor={C.gray}
                />
              )}
            </View>
          </View>

          {/* ── Mapa Real con Leaflet (OpenStreetMap) ── */}
          <View style={styles.mapContainer}>
            {latitude && longitude ? (
              <WebView
                style={{ flex: 1, borderRadius: 16 }}
                originWhitelist={['*']}
                javaScriptEnabled
                source={{
                  html: `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;border-radius:16px;}</style>
</head><body>
<div id="map"></div>
<script>
  var lat=${latitude}, lng=${longitude};
  var map = L.map('map', { zoomControl: true, attributionControl: false })
              .setView([lat, lng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  var marker = L.marker([lat, lng], { draggable: true }).addTo(map);
  marker.bindPopup('Tu ubicaci&oacute;n').openPopup();
  function sendCoords(la, ln) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ lat: la, lng: ln }));
  }
  marker.on('dragend', function(e) {
    var p = e.target.getLatLng();
    sendCoords(p.lat.toFixed(6), p.lng.toFixed(6));
  });
  map.on('click', function(e) {
    marker.setLatLng(e.latlng);
    sendCoords(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
  });
</script>
</body></html>`,
                }}
                onMessage={(event) => {
                  try {
                    const { lat: la, lng: ln } = JSON.parse(event.nativeEvent.data);
                    setLatitude(la);
                    setLongitude(ln);
                    setLocationEdited(true);
                  } catch {}
                }}
              />
            ) : (
              <View style={styles.mapLoading}>
                <ActivityIndicator color="#9EB36D" size="small" />
                <Text style={styles.mapLoadingText}>Cargando mapa...</Text>
              </View>
            )}
          </View>

          {/* ── Especie Estimada (Igual a la sección Preguntas) ── */}
          <View style={styles.speciesSection}>
            <Text style={styles.sectionTitleCenter}>¿Qué especie crees que es?</Text>
            <View style={styles.speciesInputRow}>
              <TextInput
                style={styles.speciesInput}
                value={species}
                onChangeText={setSpecies}
                placeholder="Escribe tu respuesta acá..."
                placeholderTextColor={C.gray}
              />
            </View>
          </View>

          {/* ── Sección de Preguntas ── */}
          <View style={styles.questionsSection}>
            <Text style={styles.sectionTitleCenter}>Preguntas</Text>

            <View style={styles.questionInputRow}>
              <TextInput
                style={styles.questionInput}
                value={question}
                onChangeText={(v) => setQuestion(v.slice(0, 130))}
                placeholder="Escribe tu pregunta acá.."
                placeholderTextColor={C.gray}
                multiline
                maxLength={130}
              />
              <TouchableOpacity activeOpacity={0.7}>
                <Ionicons name="add" size={28} color={C.earth} />
              </TouchableOpacity>
            </View>
            <Text style={styles.charCount}>{question.length}/130 caracteres</Text>
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

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.sage,
  },

  topHeader: {
    backgroundColor: C.sage,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.avatarBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconBtn: {
    padding: 4,
  },

  mainCard: {
    flex: 1,
    backgroundColor: C.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 50,
  },

  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backBtn: {
    marginRight: 12,
  },
  formTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: C.earth,
  },

  badgeWrapper: {
    alignItems: 'flex-start',
    marginBottom: 16,
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

  inputsSection: {
    gap: 20,
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 8,
  },
  inputField: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.earth,
  },

  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 40,
    backgroundColor: '#E5F3EB',
  },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    flexDirection: 'row',
  },
  mapLoadingText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#9EB36D',
  },

  // ── Estilos compartidos de las Secciones (Especie y Preguntas) ──
  sectionTitleCenter: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: C.earth,
    textAlign: 'center',
    marginBottom: 20,
  },

  // ── Especie Estimada ──
  speciesSection: {
    marginBottom: 40,
  },
  speciesInputRow: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 8,
  },
  speciesInput: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.earth,
    textAlign: 'left',
  },

  // ── Preguntas ──
  questionsSection: {
    marginBottom: 40,
  },
  questionInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questionInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.earth,
    marginRight: 10,
  },
  charCount: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: C.gray,
  },

  // ── Botón Publicar ──
  publishBtn: {
    backgroundColor: C.earth,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    width: '100%',
    shadowColor: C.earth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 6,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 20,
    color: C.white,
  },
});