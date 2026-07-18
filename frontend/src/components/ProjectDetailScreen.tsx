import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../utils/authStore';
import type { Investigation } from './ProjectListScreen';
import { ProjectDetailSkeleton } from './Skeleton';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihc-2-0.onrender.com';

const C = {
  bg: '#F6F6F6',
  cardBg: '#FFFFFF',
  white: '#FFFFFF',
  border: '#E8E8E8',
  sage: '#9EB36D',
  sageBg: 'rgba(158,179,109,0.12)',
  textColor: '#473C33', // Color de tipografía solicitado
};

interface ProjectDetailScreenProps {
  project: Investigation;
  onBack: () => void;
  isSubscribed: boolean;
  onSubscribedChange: (id: string, joined: boolean) => void;
  isGuest?: boolean;
}

export default function ProjectDetailScreen({
  project,
  onBack,
  isSubscribed,
  onSubscribedChange,
  isGuest = false,
}: ProjectDetailScreenProps) {
  const [detail, setDetail] = useState<Investigation>(project);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [contributions, setContributions] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [surveysExpanded, setSurveysExpanded] = useState(false);

  const daysActive = Math.max(
    0,
    Math.floor((Date.now() - new Date(detail.start_date).getTime()) / (1000 * 60 * 60 * 24))
  );
  const daysLeft = Math.max(
    0,
    Math.floor((new Date(detail.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
  const questions: any[] = Array.isArray(detail.survey_questions) ? detail.survey_questions : [];

  useEffect(() => {
    const fetchDetailAndContributions = async () => {
      try {
        const { token } = await authStore.getSession();
        
        // 1. Obtener detalles del proyecto
        const res = await fetch(`${API_URL}/api/v1/investigations/${project.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setDetail(data);
        }

        // 2. Obtener contribuciones (avistamientos) del proyecto
        const contribRes = await fetch(`${API_URL}/api/v1/investigations/${project.id}/contributions`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (contribRes.ok) {
          const contribData = await contribRes.json();
          const list = contribData.contributions || [];
          setContributions(list);
          
          // Establecer la imagen seleccionada por defecto
          if (list.length > 0 && list[0].photo_url) {
            setSelectedImage(list[0].photo_url);
          } else if (project.cover_url) {
            setSelectedImage(project.cover_url);
          }
        }
      } catch (err) {
        console.warn('Error al cargar detalles o contribuciones del proyecto:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetailAndContributions();
  }, [project.id, project.cover_url]);

  const handleJoin = async () => {
    if (isGuest) {
      Alert.alert(
        'Inicia sesión',
        'Crea una cuenta gratuita para unirte a investigaciones científicas.',
        [{ text: 'OK' }],
      );
      return;
    }
    
    setJoining(true);
    try {
      const { token } = await authStore.getSession();
      const res = await fetch(`${API_URL}/api/v1/investigations/${project.id}/subscribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        onSubscribedChange(project.id, true);
        Alert.alert('¡Unido!', `Ahora formas parte del proyecto "${detail.title}".`);
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', err.message ?? 'No se pudo unir al proyecto.');
      }
    } catch {
      Alert.alert('Error', 'Verifica tu conexión e intenta de nuevo.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <TouchableOpacity onPress={onBack} style={styles.backOnlyBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={C.textColor} />
        </TouchableOpacity>
        <ProjectDetailSkeleton />
      </View>
    );
  }

  const mainImageUri = selectedImage || 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=600&auto=format&fit=crop';

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── SECCIÓN SUPERIOR: CARD DE IMAGEN ESTILO VIAJES ── */}
        <View style={styles.imageCardContainer}>
          <Image source={{ uri: mainImageUri }} style={styles.mainImage} />
          <View style={styles.imageGradientOverlay} />

          {/* Botones de acción superiores */}
          <TouchableOpacity onPress={onBack} style={styles.topRoundBtnLeft} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={22} color={C.textColor} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setLiked(!liked)} style={styles.topRoundBtnRight} activeOpacity={0.85}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? "#E57373" : C.textColor} />
          </TouchableOpacity>

          {/* Información superpuesta abajo en el Card */}
          <View style={styles.cardInfoWrap}>
            <Text style={styles.cardTitle} numberOfLines={2}>{detail.title}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={14} color={C.white} />
              <Text style={styles.locationText} numberOfLines={1}>
                {detail.methods ? detail.methods.substring(0, 35) : 'Reserva Nacional, Venezuela'}
              </Text>
            </View>
          </View>

          {/* Lateral derecho: Mazo vertical de fotos de avistamientos (Scrollable) */}
          <View style={styles.sidebarWrapper}>
            <ScrollView
              style={styles.sidebarScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sidebarContent}
            >
              {contributions.length > 0 ? (
                contributions.map((c, idx) => (
                  <TouchableOpacity
                    key={c.id || idx}
                    onPress={() => setSelectedImage(c.photo_url)}
                    style={[
                      styles.thumbBtn,
                      selectedImage === c.photo_url && styles.thumbBtnActive
                    ]}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: c.photo_url }} style={styles.thumbImage} />
                  </TouchableOpacity>
                ))
              ) : (
                [1, 2, 3].map((num) => (
                  <View key={num} style={[styles.thumbBtn, styles.thumbPlaceholder]}>
                    <Ionicons name="image-outline" size={16} color={C.textColor} opacity={0.5} />
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>

        {/* ── MÉTRICAS: Solo días activo en el centro sin card ── */}
        <View style={styles.centeredMetricRow}>
          <Text style={styles.singleMetricValue}>{daysActive}d</Text>
          <Text style={styles.singleMetricLabel}>Días Activo</Text>
        </View>

        {/* ── DESCRIPCIÓN ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.bodyText}>{detail.description}</Text>
        </View>

        {/* ── PERÍODO ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Período de Investigación</Text>
          <View style={styles.datesRow}>
            <View style={styles.datePill}>
              <Ionicons name="play-outline" size={14} color={C.sage} />
              <Text style={styles.dateText}>
                Inicio: {new Date(detail.start_date).toLocaleDateString('es-VE', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.datePill}>
              <Ionicons name="stop-outline" size={14} color={C.textColor} />
              <Text style={styles.dateText}>
                Cierre: {new Date(detail.end_date).toLocaleDateString('es-VE', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── ENCUESTAS EXPANDIBLES ── */}
        {questions.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.expandableHeader}
              onPress={() => setSurveysExpanded(!surveysExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Encuestas</Text>
              <View style={styles.expandableHeaderRight}>
                <Text style={styles.sectionCount}>({questions.length})</Text>
                <Ionicons
                  name={surveysExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={C.textColor}
                />
              </View>
            </TouchableOpacity>

            {surveysExpanded && (
              <View style={styles.expandedContent}>
                {questions.map((q: any, idx: number) => (
                  <View key={idx} style={styles.questionCard}>
                    <Text style={styles.questionText}>
                      {idx + 1}. {typeof q === 'string' ? q : (q.question ?? q.text ?? JSON.stringify(q))}
                    </Text>
                    {Array.isArray(q.options) && q.options.length > 0 ? (
                      <View style={styles.optionsWrap}>
                        {q.options.map((opt: string, oi: number) => (
                          <TouchableOpacity
                            key={oi}
                            style={[styles.optionBtn, answers[idx] === opt && styles.optionBtnSelected]}
                            activeOpacity={0.75}
                            onPress={() => setAnswers((prev) => ({ ...prev, [idx]: opt }))}
                          >
                            <Text style={[styles.optionText, answers[idx] === opt && styles.optionTextSelected]}>
                              {opt}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.freeAnswerBox}>
                        <Text style={styles.freeAnswerPlaceholder}>
                          {answers[idx] ?? 'Respuesta libre...'}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── BARRA DE ACCIÓN INFERIOR (FLOTANDO POR ENCIMA DEL FOOTER) ── */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarLeft}>
          <Text style={styles.bottomBarLabel}>Miembros</Text>
          <Text style={styles.bottomBarValue}>
            {isSubscribed ? 'Miembro Activo' : 'No Unido'}
          </Text>
        </View>

        {joining ? (
          <View style={styles.bottomRoundBtn}>
            <ActivityIndicator color={C.white} size="small" />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.bottomRoundBtn}
            onPress={handleJoin}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isSubscribed ? "checkmark-sharp" : "add-sharp"}
              size={26}
              color={C.white}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  backOnlyBtn: { padding: 16 },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
    gap: 24,
  },

  // ── Card de Imagen Superior (Estilo Viaje) ──
  imageCardContainer: {
    width: '100%',
    height: 380,
    borderRadius: 36,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E0E0E0',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  // Botones flotantes arriba
  topRoundBtnLeft: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  topRoundBtnRight: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Info superpuesta abajo en el Card
  cardInfoWrap: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 120,
    gap: 6,
    zIndex: 5,
  },
  cardTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: C.white,
    lineHeight: 26,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // Sidebar lateral de miniaturas
  sidebarWrapper: {
    position: 'absolute',
    right: 16,
    top: 80,
    bottom: 20,
    width: 60,
    zIndex: 10,
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarContent: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  thumbBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbBtnActive: {
    borderColor: C.sage,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },

  // ── Métrica Centrada (Sin Card) ──
  centeredMetricRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 2,
  },
  singleMetricValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 32,
    color: C.textColor, // Usar color unificado
  },
  singleMetricLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: C.textColor,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ── Secciones de Texto ──
  section: { gap: 10 },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: C.textColor,
  },
  sectionCount: {
    fontFamily: 'Poppins_500Medium',
    color: C.textColor,
    fontSize: 15,
  },
  bodyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.textColor,
    lineHeight: 22,
  },

  // ── Fechas ──
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.cardBg,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  dateText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: C.textColor,
  },

  // ── Encuestas Expandibles ──
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  expandableHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandedContent: {
    marginTop: 16,
    gap: 16,
  },
  questionCard: {
    backgroundColor: C.cardBg,
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  questionText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: C.textColor,
    lineHeight: 20,
  },
  optionsWrap: { gap: 8 },
  optionBtn: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: C.bg,
  },
  optionBtnSelected: {
    borderColor: C.sage,
    backgroundColor: C.sageBg,
  },
  optionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.textColor,
  },
  optionTextSelected: {
    fontFamily: 'Poppins_600SemiBold',
    color: C.textColor,
  },
  freeAnswerBox: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 8,
  },
  freeAnswerPlaceholder: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.textColor,
    opacity: 0.5,
    fontStyle: 'italic',
  },

  // ── Barra de Acción Inferior (Fija sobre el Footer) ──
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: C.cardBg,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  bottomBarLeft: {
    gap: 4,
  },
  bottomBarLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: C.textColor,
    opacity: 0.6,
  },
  bottomBarValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: C.textColor,
  },
  bottomRoundBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.textColor, // Color del botón marrón solicitado (#473C33)
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.textColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
