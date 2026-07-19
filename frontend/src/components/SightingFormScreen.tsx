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
import * as FileSystem from 'expo-file-system/legacy';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { WebView } from 'react-native-webview';
import { authStore as auth, useSession } from '../utils/authStore';

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
  prefilledProjectId?: string;
  prefilledSurveyAnswers?: string;
}

export default function SightingFormScreen({
  photoUri,
  photoTimestamp,
  onBack,
  onPublished,
  prefilledProjectId,
  prefilledSurveyAnswers,
}: SightingFormProps) {
  const insets = useSafeAreaInsets();
  const { user } = useSession();

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
  const [accuracy, setAccuracy] = useState<number | null>(null);

  // ── Banderas para "Metadatos editados" ────────────────────
  const [dateEdited, setDateEdited] = useState(false);
  const [timeEdited, setTimeEdited] = useState(false);
  const [locationEdited, setLocationEdited] = useState(false);

  const metadataEdited = dateEdited || timeEdited || locationEdited;

  const [loadingLocation, setLoadingLocation] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const [userRole, setUserRole] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [createProject, setCreateProject] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  // ── Estado para vincular proyecto existente (Funcionalidad 3) ──
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(prefilledProjectId || null);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  // Cargar rol y proyectos disponibles al montar
  useEffect(() => {
    const load = async () => {
      const { user, token: t } = await auth.getSession();
      if (user) {
        if (user.role) setUserRole(user.role.toLowerCase());
        setToken(t);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadProjects = async () => {
      if (!token) return;
      try {
        let subsList: any[] = [];
        const res = await fetch(`${API_URL}/api/v1/investigations/my-subscriptions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          subsList = data.subscriptions || [];
        }

        let createdList: any[] = [];
        if (user?.role?.toLowerCase() === 'especialista') {
          const resMy = await fetch(`${API_URL}/api/v1/investigations/my`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resMy.ok) {
            const dataMy = await resMy.json();
            createdList = dataMy.investigations || dataMy || [];
          }
        }

        const map = new Map();
        subsList.forEach((p) => map.set(p.id, p));
        if (user?.role?.toLowerCase() === 'especialista') {
          createdList.forEach((p) => {
            if (!map.has(p.id)) map.set(p.id, p);
          });
        }
        const merged = Array.from(map.values());

        if (merged.length > 0) {
          setAvailableProjects(merged);
        } else {
          const resActive = await fetch(`${API_URL}/api/v1/investigations/active`);
          if (resActive.ok) {
            const dataActive = await resActive.json();
            setAvailableProjects(Array.isArray(dataActive) ? dataActive : []);
          }
        }
      } catch (err) {
        console.warn('Error cargando proyectos en formulario:', err);
      }
    };
    if (token) loadProjects();
  }, [token, user?.role]);

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
        const { latitude: lat, longitude: lng, accuracy: acc } = loc.coords;
        
        // Filtramos datos muy ruidosos si la precisión es peor a 100 metros
        if (acc && acc > 100) {
          console.warn('GPS poco preciso:', acc);
        }
        
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
        setAccuracy(acc);

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

    if (createProject) {
      if (!projectTitle.trim() || !projectDescription.trim()) {
        Alert.alert('Campos requeridos', 'Por favor ingresa el nombre del proyecto y sus metas.');
        return;
      }
    }

    setPublishing(true);

    try {
      const { token: activeToken } = await auth.getSession();
      if (!activeToken) {
        Alert.alert('Sesión expirada', 'Por favor inicia sesión nuevamente.');
        setPublishing(false);
        return;
      }

      let targetInvestigationId = selectedProjectId;

      // 1. Si se eligió crear proyecto, lo creamos primero
      if (createProject) {
        const today = new Date().toISOString().split('T')[0];
        const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const resProj = await fetch(`${API_URL}/api/v1/investigations`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: projectTitle.trim(),
            description: projectDescription.trim(),
            start_date: today,
            end_date: nextYear,
            status: 'active',
          }),
        });

        if (!resProj.ok) {
          const err = await resProj.json().catch(() => ({}));
          throw new Error(err.message || 'No se pudo crear el proyecto para este avistamiento.');
        }
        const createdProj = await resProj.json();
        targetInvestigationId = createdProj.id;
      }

      // 2. Continuar con la publicación del avistamiento (o contribución a proyecto)
      const fileName = photoUri.split('/').pop() ?? 'photo.jpg';
      const fileType = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      
      if (fileType !== 'image/png' && fileType !== 'image/jpeg') {
        throw new Error('Tipo de archivo no permitido. Solo JPG y PNG.');
      }
      
      const fileInfo = await FileSystem.getInfoAsync(photoUri);
      if (fileInfo.exists && fileInfo.size && fileInfo.size > 5 * 1024 * 1024) {
        throw new Error('La imagen supera el tamaño máximo permitido de 5MB.');
      }

      const formData = new FormData();
      
      const normalizedUri = Platform.OS === 'ios' ? photoUri.replace('file://', '') : photoUri;
      formData.append('photo', JSON.parse(JSON.stringify({ 
        uri: normalizedUri, 
        name: fileName, 
        type: fileType 
      })));

      if (species.trim()) formData.append('preliminary_species', species.trim());
      formData.append('observed_at', new Date(photoTimestamp || Date.now()).toISOString());
      
      if (latitude && longitude) {
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
      }
      
      if (accuracy) {
        formData.append('accuracy', accuracy.toString());
      }

      if (metadataEdited) {
        formData.append('metadata_edited', 'true');
      }

      let endpointUrl = `${API_URL}/api/v1/sightings`;
      if (targetInvestigationId) {
        endpointUrl = `${API_URL}/api/v1/contributions`;
        formData.append('investigation_id', targetInvestigationId);
        if (prefilledSurveyAnswers) {
          formData.append('survey_answers', prefilledSurveyAnswers);
        }
      }

      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 
          Accept: 'application/json',
          Authorization: `Bearer ${activeToken}` 
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Error ${res.status}`);
      }

      const successMsg = createProject 
        ? 'El proyecto y tu avistamiento fueron creados exitosamente.'
        : targetInvestigationId
          ? 'Tu avistamiento fue aportado al proyecto científico.'
          : 'Tu avistamiento fue enviado para revisión.';

      Alert.alert('¡Publicado!', successMsg, [
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
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={{ width: 44, height: 44, borderRadius: 22, resizeMode: 'cover' }} />
          ) : (
            <Ionicons name="person" size={20} color={C.earth} />
          )}
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
                onMessage={(event: any) => {
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

          {/* ── Sección de Proyecto (Solo Especialistas) ── */}
          {userRole === 'especialista' && (
            <View style={styles.projectSection}>
              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.7}
                onPress={() => setCreateProject(!createProject)}
              >
                <Ionicons
                  name={createProject ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={C.earth}
                />
                <Text style={styles.checkboxLabel}>Crear un nuevo proyecto para este avistamiento</Text>
              </TouchableOpacity>

              {createProject && (
                <View style={styles.projectInputsWrapper}>
                  <TextInput
                    style={styles.projectInput}
                    value={projectTitle}
                    onChangeText={setProjectTitle}
                    placeholder="Nombre del Proyecto"
                    placeholderTextColor={C.gray}
                    maxLength={100}
                  />
                  <TextInput
                    style={[styles.projectInput, { minHeight: 70, textAlignVertical: 'top' }]}
                    value={projectDescription}
                    onChangeText={setProjectDescription}
                    placeholder="Metas del Proyecto (Descripción)"
                    placeholderTextColor={C.gray}
                    multiline
                    maxLength={300}
                  />
                </View>
              )}
            </View>
          )}

          {/* ── Vincular a proyecto existente (Para todos los usuarios, Funcionalidad 3) ── */}
          {!createProject && (
            <View style={styles.projectLinkBox}>
              <Text style={styles.projectLinkTitle}>Vincular a Proyecto Científico</Text>
              <TouchableOpacity
                style={styles.projectLinkSelector}
                onPress={() => setShowProjectPicker(!showProjectPicker)}
                activeOpacity={0.8}
              >
                <Ionicons name="folder-open-outline" size={18} color={C.earth} />
                <Text style={styles.projectLinkSelectedText} numberOfLines={1}>
                  {selectedProjectId
                    ? availableProjects.find(p => (p.investigation_id || p.id || p.investigation?.id) === selectedProjectId)?.investigation?.title ||
                      availableProjects.find(p => (p.investigation_id || p.id || p.investigation?.id) === selectedProjectId)?.title ||
                      'Proyecto Seleccionado'
                    : 'Ninguno (Avistamiento general)'}
                </Text>
                <Ionicons name={showProjectPicker ? "chevron-up" : "chevron-down"} size={18} color={C.gray} />
              </TouchableOpacity>

              {showProjectPicker && (
                <View style={styles.projectPickerContainer}>
                  <TouchableOpacity
                    style={[styles.projectPickerRow, !selectedProjectId && styles.projectPickerRowActive]}
                    onPress={() => {
                      setSelectedProjectId(null);
                      setShowProjectPicker(false);
                    }}
                  >
                    <Text style={styles.projectPickerRowText}>Ninguno (Avistamiento general)</Text>
                  </TouchableOpacity>

                  {availableProjects.map((proj, i) => {
                    const pId = proj.investigation_id || proj.id || proj.investigation?.id;
                    const pTitle = proj.investigation?.title || proj.title || `Proyecto #${i + 1}`;
                    if (!pId) return null;
                    return (
                      <TouchableOpacity
                        key={pId}
                        style={[styles.projectPickerRow, selectedProjectId === pId && styles.projectPickerRowActive]}
                        onPress={() => {
                          setSelectedProjectId(pId);
                          setShowProjectPicker(false);
                        }}
                      >
                        <Text style={styles.projectPickerRowText} numberOfLines={1}>{pTitle}</Text>
                      </TouchableOpacity>
                    );
                  })}

                  {availableProjects.length === 0 && (
                    <Text style={styles.noProjectsHint}>No estás participando en proyectos activos.</Text>
                  )}
                </View>
              )}
            </View>
          )}

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
    overflow: 'hidden',
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

  // Especialista: proyecto
  projectSection: {
    width: '100%',
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: C.earth,
    flex: 1,
  },
  projectInputsWrapper: {
    marginTop: 16,
    gap: 12,
  },
  projectInput: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13.5,
    color: C.earth,
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },

  // Vincular a proyecto
  projectLinkBox: {
    width: '100%',
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  projectLinkTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: C.earth,
    marginBottom: 8,
  },
  projectLinkSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  projectLinkSelectedText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.earth,
    flex: 1,
  },
  projectPickerContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
    paddingTop: 8,
    gap: 4,
  },
  projectPickerRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  projectPickerRowActive: {
    backgroundColor: '#FCECDA',
  },
  projectPickerRowText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12.5,
    color: C.earth,
  },
  noProjectsHint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.gray,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
});