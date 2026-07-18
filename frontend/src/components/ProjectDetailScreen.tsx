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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authStore } from '../utils/authStore';
import type { Investigation } from './ProjectListScreen';
import { ProjectDetailSkeleton } from './Skeleton';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihc-2-0.onrender.com';

const C = {
  bg: '#F6F6F6',
  cardBg: '#FFFFFF',
  forest: '#1E2A21',
  earth: '#4A3F35',
  sage: '#9EB36D',
  sageBg: 'rgba(158,179,109,0.12)',
  white: '#FFFFFF',
  gray: '#A09D9A',
  border: '#E8E8E8',
  lightText: 'rgba(74,63,53,0.55)',
};

// Colores para las tarjetas de contribución
const CONTRIBUTION_CARDS = [
  { color: '#9EB36D', icon: 'binoculars' },
  { color: '#A9C26D', icon: 'leaf' },
  { color: '#7E9B56', icon: 'eye' },
  { color: '#C5D99A', icon: 'camera' },
  { color: '#9EB36D', icon: 'paw' },
];

interface ProjectDetailScreenProps {
  project: Investigation;
  onBack: () => void;
  isSubscribed: boolean;
  onSubscribedChange: (id: string, joined: boolean) => void;
}

export default function ProjectDetailScreen({
  project,
  onBack,
  isSubscribed,
  onSubscribedChange,
}: ProjectDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const [detail, setDetail] = useState<Investigation>(project);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [contributions, setContributions] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // 1. Obtener detalles del proyecto
        const resDetail = await fetch(`${API_URL}/api/v1/investigations/${project.id}`, { headers });
        if (resDetail.ok) {
          const data = await resDetail.json();
          setDetail(data);
        }

        // 2. Obtener contribuciones (avistamientos hechos)
        const resCont = await fetch(`${API_URL}/api/v1/investigations/${project.id}/contributions`, { headers });
        if (resCont.ok) {
          const data = await resCont.json();
          const list = data.contributions || [];
          setContributions(list);
          if (list.length > 0) {
            setSelectedImage(list[0].photo_url);
          }
        }
      } catch {}
      setLoading(false);
    };
    fetchDetailAndContributions();
  }, [project.id]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const { token } = await authStore.getSession();
      const res = await fetch(`${API_URL}/api/v1/investigations/${project.id}/subscribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        onSubscribedChange(project.id, true);
        Alert.alert('¡Unido!', `Ahora participas en "${detail.title}".`);
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

  const getSelectedImage = () => {
    if (selectedImage) return selectedImage;
    if (detail.cover_url) return detail.cover_url;
    return 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800'; // Placeholder bosque
  };

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={onBack} style={styles.backOverlayBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={C.earth} />
        </TouchableOpacity>
        <ProjectDetailSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* ── CONTENEDOR DE LA IMAGEN PRINCIPAL (ESTILO MOCKUP BUDA) ── */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: getSelectedImage() }}
          style={styles.mainImage}
          resizeMode="cover"
        />

        {/* Degradado oscuro en la base para hacer legibles los textos */}
        <View style={styles.bottomScrim} />

        {/* Botón flotante de regreso (atrás) */}
        <TouchableOpacity onPress={onBack} style={styles.backOverlayBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={C.earth} />
        </TouchableOpacity>

        {/* Botón de favorito/opciones */}
        <TouchableOpacity style={styles.favoriteOverlayBtn} activeOpacity={0.7}>
          <Ionicons name="heart-outline" size={22} color={C.earth} />
        </TouchableOpacity>

        {/* Textos superpuestos en la imagen */}
        <View style={styles.titleOverlay}>
          <Text style={styles.overlayTitle} numberOfLines={2}>{detail.title}</Text>
          {detail.methods && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color={C.white} style={{ marginRight: 4 }} />
              <Text style={styles.overlaySubtitle} numberOfLines={1}>{detail.methods}</Text>
            </View>
          )}
        </View>

        {/* Mazo de avistamientos lateral derecho (scroll vertical flotante) */}
        {contributions.length > 0 && (
          <View style={styles.thumbnailListContainer}>
            <ScrollView
              style={styles.thumbnailScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailScrollContent}
            >
              {contributions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.thumbnailWrapper,
                    selectedImage === item.photo_url && styles.thumbnailActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedImage(item.photo_url)}
                >
                  <Image source={{ uri: item.photo_url }} style={styles.thumbnailImg} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* ── SCROLL DE CONTENIDO ── */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Botón Unirme grande (Estilo Entrar) ── */}
        {!isSubscribed ? (
          <TouchableOpacity
            style={styles.joinBtnLarge}
            activeOpacity={0.85}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={styles.joinBtnLargeText}>Unirme al proyecto</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.joinedBar}>
            <Ionicons name="checkmark-circle" size={22} color={C.sage} />
            <Text style={styles.joinedBarText}>Ya formas parte de este proyecto</Text>
          </View>
        )}

        {/* ── Métricas rápidas ── */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{daysActive}d</Text>
            <Text style={styles.metricLbl}>Activo</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{daysLeft}d</Text>
            <Text style={styles.metricLbl}>Restantes</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{questions.length}</Text>
            <Text style={styles.metricLbl}>Encuestas</Text>
          </View>
        </View>

        {/* ── Metas ── */}
        {detail.methods && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metas</Text>
            <Text style={styles.bodyText}>{detail.methods}</Text>
          </View>
        )}

        {/* ── Período ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Período</Text>
          <View style={styles.datesRow}>
            <View style={styles.datePill}>
              <Ionicons name="play-outline" size={14} color={C.sage} />
              <Text style={styles.dateText}>
                {new Date(detail.start_date).toLocaleDateString('es-VE', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={14} color={C.lightText} />
            <View style={styles.datePill}>
              <Ionicons name="stop-outline" size={14} color={C.earth} />
              <Text style={styles.dateText}>
                {new Date(detail.end_date).toLocaleDateString('es-VE', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Contribuciones (Mazo horizontal abajo de Período) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contribuciones</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.contributionsScroll}
          >
            {isSubscribed ? (
              CONTRIBUTION_CARDS.map((card, i) => (
                <View key={i} style={[styles.contributionCard, { backgroundColor: card.color }]}>
                  <MaterialCommunityIcons name={card.icon as any} size={28} color={C.white} />
                  <Text style={styles.contributionCardText}>Aporte {i + 1}</Text>
                </View>
              ))
            ) : (
              CONTRIBUTION_CARDS.map((card, i) => (
                <View key={i} style={[styles.contributionCard, styles.contributionCardLocked, { borderColor: card.color }]}>
                  <Ionicons name="lock-closed-outline" size={22} color={C.gray} />
                  <Text style={styles.contributionCardLockedText}>Únete</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* ── Encuestas ── */}
        {questions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Encuestas <Text style={styles.sectionCount}>({questions.length})</Text>
            </Text>
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

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── FOOTER FIJO (ESTILO MOCKUP BUDA) ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerLabel}>Período</Text>
          <Text style={styles.footerVal}>
            {new Date(detail.start_date).toLocaleDateString('es-VE', { month: 'short', year: 'numeric' })} - {new Date(detail.end_date).toLocaleDateString('es-VE', { month: 'short', year: 'numeric' })}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.circularJoinBtn}
          activeOpacity={0.85}
          onPress={isSubscribed ? undefined : handleJoin}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator color={C.white} size="small" />
          ) : (
            <Ionicons
              name={isSubscribed ? 'checkmark' : 'add'}
              size={28}
              color={C.white}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // ── Contenedor Imagen Principal ──
  imageContainer: {
    width: '100%',
    height: height * 0.42, // Alrededor del 42% del alto de la pantalla
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: C.forest,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backOverlayBtn: {
    position: 'absolute',
    top: 24,
    left: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  favoriteOverlayBtn: {
    position: 'absolute',
    top: 24,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 110, // Margen para no chocar con las miniaturas
    gap: 4,
  },
  overlayTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: C.white,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlaySubtitle: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // Miniaturas del lateral derecho (Scroll vertical)
  thumbnailListContainer: {
    position: 'absolute',
    right: 16,
    top: 80,
    bottom: 20,
    width: 70,
    zIndex: 25,
  },
  thumbnailScroll: {
    flex: 1,
  },
  thumbnailScrollContent: {
    gap: 12,
    paddingBottom: 20,
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailActive: {
    borderColor: '#FFFFFF',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },

  // ── Scroll Content ──
  scroll: { flex: 1 },
  scrollContent: {
    padding: 20,
    gap: 24,
  },

  // Botón Unirme Grande (Estilo login btnEntrar)
  joinBtnLarge: {
    width: '100%',
    backgroundColor: C.earth,
    borderRadius: 18,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: C.earth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  joinBtnLargeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: C.white,
  },
  joinedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.cardBg,
    borderRadius: 18,
    paddingVertical: 20,
    borderWidth: 1.5,
    borderColor: C.sage,
  },
  joinedBarText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: C.sage,
  },

  // Métricas
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: C.cardBg,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  metricVal: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: C.forest,
  },
  metricLbl: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: C.gray,
  },

  // Secciones
  section: { gap: 12 },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: C.forest,
  },
  sectionCount: {
    fontFamily: 'Poppins_400Regular',
    color: C.gray,
    fontSize: 14,
  },
  bodyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.earth,
    lineHeight: 22,
  },

  // Período
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.cardBg,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  dateText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.earth,
  },

  // Contribuciones (Horizontal)
  contributionsScroll: {
    paddingRight: 8,
    gap: 12,
    flexDirection: 'row',
  },
  contributionCard: {
    width: 110,
    height: 130,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  contributionCardText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: C.white,
  },
  contributionCardLocked: {
    backgroundColor: C.cardBg,
    borderWidth: 1.5,
  },
  contributionCardLockedText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: C.gray,
  },

  // Encuestas
  questionCard: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  questionText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: C.earth,
    lineHeight: 20,
  },
  optionsWrap: { gap: 8 },
  optionBtn: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 10,
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
    color: C.earth,
  },
  optionTextSelected: {
    fontFamily: 'Poppins_600SemiBold',
    color: C.forest,
  },
  freeAnswerBox: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 8,
  },
  freeAnswerPlaceholder: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.gray,
    fontStyle: 'italic',
  },

  // Footer fijo (Estilo mockup)
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerLeft: {
    gap: 2,
  },
  footerLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.gray,
  },
  footerVal: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
    color: C.earth,
  },
  circularJoinBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.earth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.earth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
