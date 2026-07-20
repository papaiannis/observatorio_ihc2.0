/**
 * CuradoriaScreen.tsx
 *
 * Panel de curaduría exclusivo para Especialistas.
 * Muestra la bandeja de aportes pendientes, permite buscar la especie correcta
 * en la tabla `species`, asignar una calificación 1-5 estrellas y validar/rechazar.
 *
 * Flujo: Bandeja → Detalle del aporte → Búsqueda de especie → Calificación → Validar/Rechazar
 *
 * Endpoints esperados:
 *  GET  /api/v1/contributions/pending           → { contributions: Contribution[] }
 *  GET  /api/v1/species/search?q=...            → { species: Species[] }
 *  PATCH /api/v1/contributions/:id/validate     → { expert_rating, expert_comment, species_id }
 *  PATCH /api/v1/contributions/:id/reject       → { expert_comment }
 *
 *  Fallback: si /contributions/pending no existe, consulta /sightings/pending
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';
import { authStore } from '../utils/authStore';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihcobservatorio2-202625.onrender.com';

const C = {
  bg: '#F6F6F6',
  white: '#FFFFFF',
  forest: '#1E2A21',
  earth: '#4A3F35',
  sage: '#9EB36D',
  purple: '#7B5EA7',
  purpleLight: '#EEE8F8',
  border: 'rgba(74,63,53,0.12)',
  gray: '#A09D9A',
  lightText: 'rgba(74,63,53,0.55)',
  yellow: '#F5C518',
};

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Contribution {
  id: string;
  photo_url?: string;
  preliminary_species?: string;
  observed_at: string;
  decimal_latitude?: number;
  decimal_longitude?: number;
  metadata_edited?: boolean;
  survey_answers?: Record<string, string>;
  contribution_status: 'pending' | 'validated' | 'rejected' | 'in_review';
  profiles?: { username: string; avatar_url?: string };
  /** Tabla de origen: determina el endpoint y los campos soportados por el backend */
  _source: 'contribution' | 'sighting';
}

interface Species {
  id: string;
  scientific_name: string;
  common_name?: string;
}

type ScreenView = 'list' | 'detail';

interface CuradoriaScreenProps {
  onBack: () => void;
}

// ── Componente Principal ───────────────────────────────────────────────────────
export default function CuradoriaScreen({ onBack }: CuradoriaScreenProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(height)).current;

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  // ── Estado de la pantalla ─────────────────────────────────────────────────
  const [view, setView] = useState<ScreenView>('list');
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Contribution | null>(null);

  // ── Estado del formulario de validación ───────────────────────────────────
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [speciesResults, setSpeciesResults] = useState<Species[]>([]);
  const [searchingSpecies, setSearchingSpecies] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Debounce ref para la búsqueda de especie ──────────────────────────────
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide-up animation al montar
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleBack = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(onBack);
  };

  // ── Cargar bandeja de pendientes ──────────────────────────────────────────
  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const { token } = await authStore.getSession();

      const headers = { Authorization: `Bearer ${token}` };
      const [contribRes, sightRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/v1/contributions/pending`, { headers }),
        fetch(`${API_URL}/api/v1/sightings/pending`, { headers })
      ]);

      let allPending: Contribution[] = [];

      if (contribRes.status === 'fulfilled' && contribRes.value.ok) {
        const data = await contribRes.value.json();
        const normalized: Contribution[] = (data.contributions ?? []).map((c: any) => ({
          ...c,
          _source: 'contribution',
        }));
        allPending = allPending.concat(normalized);
      }

      if (sightRes.status === 'fulfilled' && sightRes.value.ok) {
        const data = await sightRes.value.json();
        const normalized: Contribution[] = (data.sightings ?? []).map((s: any) => ({
          ...s,
          contribution_status: s.status,
          _source: 'sighting',
        }));
        allPending = allPending.concat(normalized);
      }

      // Ordenar por fecha (más antiguos primero, como estaba el backend)
      allPending.sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime());

      setContributions(allPending);
    } catch {
      Alert.alert('Error de red', 'No se pudo cargar la bandeja de pendientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  // ── Búsqueda de especie con debounce de 400 ms ────────────────────────────
  /**
   * @param q - término de búsqueda (nombre científico o común)
   */
  const searchSpecies = (q: string) => {
    setSpeciesQuery(q);
    setSelectedSpecies(null);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!q.trim()) { setSpeciesResults([]); return; }

    debounceTimer.current = setTimeout(async () => {
      setSearchingSpecies(true);
      try {
        const { token } = await authStore.getSession();
        const res = await fetch(
          `${API_URL}/api/v1/species/search?q=${encodeURIComponent(q)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data = await res.json();
          setSpeciesResults(data.species ?? []);
        }
      } catch {
        // Fallo silencioso — el especialista puede dejarlo vacío
      } finally {
        setSearchingSpecies(false);
      }
    }, 400);
  };

  // ── Abrir detalle de un aporte ────────────────────────────────────────────
  const openDetail = (contribution: Contribution) => {
    setSelected(contribution);
    setRating(0);
    setComment('');
    setView('detail');

    if (contribution.preliminary_species) {
      searchSpecies(contribution.preliminary_species);
    } else {
      setSpeciesQuery('');
      setSpeciesResults([]);
      setSelectedSpecies(null);
    }
  };

  // ── Validar aporte ────────────────────────────────────────────────────────
  /**
   * Contribuciones: PATCH /contributions/:id/validate { validated_species_id, expert_comment?, expert_rating? }
   * Avistamientos independientes: PATCH /sightings/:id/validate { validated_species_id }
   * (el backend de sightings no admite comentario ni calificación de experto)
   */
  const handleValidate = async () => {
    if (!selected) return;
    if (!selectedSpecies) {
      Alert.alert('Especie requerida', 'Busca y selecciona la especie identificada antes de validar.');
      return;
    }

    const isContribution = selected._source !== 'sighting';
    const endpointBase = isContribution ? 'contributions' : 'sightings';

    setSubmitting(true);
    try {
      const { token } = await authStore.getSession();
      const body: Record<string, unknown> = { validated_species_id: selectedSpecies.id };
      
      if (isContribution) {
        if (comment.trim()) body.expert_comment = comment.trim();
        if (rating > 0) body.expert_rating = rating;
      }

      const res = await fetch(`${API_URL}/api/v1/${endpointBase}/${selected.id}/validate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        Alert.alert('✅ Validado', 'El aporte fue validado y el autor fue notificado.');
        setContributions((prev) => prev.filter((c) => c.id !== selected.id));
        setView('list');
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', (err as any).detail ?? 'No se pudo validar el aporte.');
      }
    } catch {
      Alert.alert('Error de red', 'Verifica tu conexión e intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!fontsLoaded) return null;

  // ── VISTA: Lista de pendientes ────────────────────────────────────────────
  const renderList = () => (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.headerSide} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.earth} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Panel de Curaduría</Text>
        <TouchableOpacity onPress={loadPending} style={styles.headerSide} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={22} color={C.purple} />
        </TouchableOpacity>
      </View>

      <View style={styles.counterRow}>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{contributions.length} pendientes</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.purple} />
          <Text style={styles.loadingText}>Cargando bandeja...</Text>
        </View>
      ) : contributions.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle-outline" size={64} color={C.sage} />
          <Text style={styles.emptyTitle}>¡Bandeja al día!</Text>
          <Text style={styles.emptySubtitle}>No hay aportes pendientes de revisión.</Text>
        </View>
      ) : (
        <FlatList
          data={contributions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const dateStr = new Date(item.observed_at).toLocaleDateString('es-VE', {
              day: '2-digit', month: 'short', year: 'numeric',
            });
            return (
              <TouchableOpacity
                style={styles.pendingCard}
                activeOpacity={0.85}
                onPress={() => openDetail(item)}
              >
                {item.photo_url ? (
                  <Image source={{ uri: item.photo_url }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]}>
                    <Ionicons name="image-outline" size={28} color={C.gray} />
                  </View>
                )}

                <View style={styles.pendingInfo}>
                  <Text style={styles.pendingSpecies} numberOfLines={1}>
                    {item.preliminary_species ?? 'Especie sin identificar'}
                  </Text>
                  <Text style={styles.pendingMeta}>
                    {dateStr}
                    {item.profiles?.username ? ` · @${item.profiles.username}` : ''}
                  </Text>
                  {item.metadata_edited && (
                    <View style={styles.editedBadge}>
                      <Text style={styles.editedBadgeText}>⚠ Coords editadas</Text>
                    </View>
                  )}
                </View>

                <Ionicons name="chevron-forward" size={20} color={C.lightText} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );

  // ── VISTA: Detalle + formulario de validación ─────────────────────────────
  const renderDetail = () => {
    if (!selected) return null;
    const isContribution = selected._source !== 'sighting';
    const dateStr = new Date(selected.observed_at).toLocaleDateString('es-VE', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => setView('list')} style={styles.headerSide} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={C.earth} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Revisar Aporte</Text>
          <View style={styles.headerSide} />
        </View>

        <ScrollView
          contentContainerStyle={styles.detailContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Foto */}
          {selected.photo_url ? (
            <Image source={{ uri: selected.photo_url }} style={styles.detailPhoto} resizeMode="cover" />
          ) : (
            <View style={[styles.detailPhoto, styles.detailPhotoFallback]}>
              <Ionicons name="image-outline" size={48} color={C.gray} />
            </View>
          )}

          {/* Metadatos flotantes sobre la foto */}
          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>
              {selected.preliminary_species ?? 'Especie sin identificar'}
            </Text>
            <Text style={styles.metaDate}>{dateStr}</Text>
            {selected.profiles?.username && (
              <Text style={styles.metaUser}>@{selected.profiles.username}</Text>
            )}
            {selected.decimal_latitude !== undefined && selected.decimal_longitude !== undefined && (
              <View style={styles.coordRow}>
                <Ionicons name="location-outline" size={14} color={C.sage} />
                <Text style={styles.coordText}>
                  {selected.decimal_latitude.toFixed(5)}, {selected.decimal_longitude.toFixed(5)}
                </Text>
                {selected.metadata_edited && (
                  <View style={styles.editedBadge}>
                    <Text style={styles.editedBadgeText}>Editado</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Respuestas de la encuesta */}
          {selected.survey_answers && Object.keys(selected.survey_answers).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Respuestas de la Encuesta</Text>
              {Object.entries(selected.survey_answers).map(([key, val]) => (
                <View key={key} style={styles.answerRow}>
                  <Text style={styles.answerKey}>{key}:</Text>
                  <Text style={styles.answerVal}>{String(val)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Clic 2: Búsqueda de especie */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Identificar Especie</Text>

            {selectedSpecies ? (
              <View style={styles.selectedSpeciesCard}>
                <View style={styles.flex}>
                  <Text style={styles.selectedScientific}>{selectedSpecies.scientific_name}</Text>
                  {selectedSpecies.common_name && (
                    <Text style={styles.selectedCommon}>{selectedSpecies.common_name}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => { setSelectedSpecies(null); setSpeciesQuery(''); }}>
                  <Ionicons name="close-circle" size={22} color={C.gray} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.searchInput}
                  value={speciesQuery}
                  onChangeText={searchSpecies}
                  placeholder="Busca por nombre científico o común..."
                  placeholderTextColor={C.lightText}
                />
                {searchingSpecies && (
                  <ActivityIndicator size="small" color={C.purple} style={{ marginTop: 8 }} />
                )}
                {speciesResults.map((sp) => (
                  <TouchableOpacity
                    key={sp.id}
                    style={styles.speciesResult}
                    onPress={() => {
                      setSelectedSpecies(sp);
                      setSpeciesResults([]);
                      setSpeciesQuery(sp.scientific_name);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.speciesScientific}>{sp.scientific_name}</Text>
                    {sp.common_name && <Text style={styles.speciesCommon}>{sp.common_name}</Text>}
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>

          {/* Clic 3: Calificación de estrellas 1-5 (solo contribuciones) */}
          {isContribution && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Calidad del Aporte</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={36}
                      color={star <= rating ? C.yellow : C.gray}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingLabel}>
                {rating === 0 ? 'Sin calificar' :
                 rating === 1 ? 'Insuficiente' :
                 rating === 2 ? 'Regular' :
                 rating === 3 ? 'Bueno' :
                 rating === 4 ? 'Muy bueno' : 'Excelente'}
              </Text>
            </View>
          )}

          {/* Comentario del especialista (solo contribuciones) */}
          {isContribution && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Comentario del Especialista</Text>
              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={setComment}
                placeholder="Observaciones o correcciones sobre la identificación..."
                placeholderTextColor={C.lightText}
                multiline
                maxLength={1000}
              />
              <Text style={styles.charCount}>{comment.length}/1000</Text>
            </View>
          )}

          {/* Clic 4: Validar */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.validateBtn, (!selectedSpecies || submitting) && { opacity: 0.5 }]}
              onPress={handleValidate}
              disabled={!selectedSpecies || submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={C.white} />
                  <Text style={styles.validateBtnText}>Validar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        styles.root,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      {view === 'list' ? renderList() : renderDetail()}
    </Animated.View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { backgroundColor: C.bg, zIndex: 9999 },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.white,
  },
  headerSide: { width: 40 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: C.earth,
  },

  counterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  counterBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEE8F8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  counterText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: C.purple,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 80,
  },
  loadingText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.gray,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    color: C.earth,
  },
  emptySubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.gray,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  listContent: { padding: 16, gap: 12 },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: C.border,
  },
  thumbFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingInfo: { flex: 1, gap: 2 },
  pendingSpecies: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.earth,
  },
  pendingMeta: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.lightText,
  },
  editedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  editedBadgeText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 10,
    color: '#E65100',
  },

  detailContent: { paddingBottom: 40 },
  detailPhoto: {
    width,
    height: width * 0.65,
    backgroundColor: C.border,
  },
  detailPhotoFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaCard: {
    backgroundColor: C.white,
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    gap: 4,
    zIndex: 10,
  },
  metaTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: C.earth,
  },
  metaDate: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.lightText,
  },
  metaUser: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.sage,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  coordText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.lightText,
  },

  section: {
    marginTop: 20,
    marginHorizontal: 16,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.earth,
    marginBottom: 4,
  },
  answerRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: C.white,
    borderRadius: 10,
    padding: 10,
  },
  answerKey: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: C.earth,
    flex: 1,
  },
  answerVal: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.lightText,
    flex: 2,
  },

  searchInput: {
    backgroundColor: C.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.earth,
    borderWidth: 1,
    borderColor: C.border,
  },
  speciesResult: {
    backgroundColor: C.white,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.purple,
    gap: 2,
  },
  speciesScientific: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: C.earth,
    fontStyle: 'italic',
  },
  speciesCommon: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.lightText,
  },
  selectedSpeciesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEE8F8',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.purple,
  },
  selectedScientific: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.purple,
    fontStyle: 'italic',
  },
  selectedCommon: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.lightText,
  },

  starsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  starBtn: { padding: 4 },
  ratingLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: C.lightText,
    textAlign: 'center',
  },

  commentInput: {
    backgroundColor: C.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.earth,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: C.gray,
    textAlign: 'right',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 24,
  },
  validateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: C.sage,
  },
  validateBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: C.white,
  },
});
