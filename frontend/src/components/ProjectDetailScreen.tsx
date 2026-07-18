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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { authStore } from '../utils/authStore';
import type { Investigation } from './ProjectListScreen';
import { ProjectDetailSkeleton } from './Skeleton';

const { width } = Dimensions.get('window');
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
  lightText: 'rgba(74,63,53,0.5)',
};

// Colores para las tarjetas del mazo horizontal
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
  const [detail, setDetail] = useState<Investigation>(project);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});

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
    const fetchDetail = async () => {
      try {
        const { token } = await authStore.getSession();
        const res = await fetch(`${API_URL}/api/v1/investigations/${project.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setDetail(data);
        }
      } catch {}
      setLoading(false);
    };
    fetchDetail();
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

  if (loading) {
    return (
      <View style={styles.root}>
        <TouchableOpacity onPress={onBack} style={styles.backOnlyBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={C.earth} />
        </TouchableOpacity>
        <ProjectDetailSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.root}>

      {/* Solo la flecha de regreso */}
      <TouchableOpacity onPress={onBack} style={styles.backOnlyBtn} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={24} color={C.earth} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Título + Estado + Métricas ── */}
        <View style={styles.heroSection}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroTitle}>{detail.title}</Text>
            <View style={[styles.statusPill, detail.status === 'active' ? styles.pillActive : styles.pillInactive]}>
              <View style={[styles.statusDot, detail.status === 'active' ? styles.dotActive : styles.dotInactive]} />
              <Text style={[styles.statusText, detail.status === 'active' ? styles.statusTextActive : styles.statusTextInactive]}>
                {detail.status === 'active' ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Ionicons name="calendar-outline" size={18} color={C.sage} />
              <Text style={styles.metricVal}>{daysActive}d</Text>
              <Text style={styles.metricLbl}>activo</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="time-outline" size={18} color={C.sage} />
              <Text style={styles.metricVal}>{daysLeft}d</Text>
              <Text style={styles.metricLbl}>restantes</Text>
            </View>
            {questions.length > 0 && (
              <View style={styles.metricCard}>
                <Ionicons name="help-circle-outline" size={18} color={C.sage} />
                <Text style={styles.metricVal}>{questions.length}</Text>
                <Text style={styles.metricLbl}>encuestas</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Métodos / Metas ── */}
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

        {/* ── Contribuciones: scroll horizontal de tarjetas ── */}
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
              // Tarjetas difuminadas si no está unido
              CONTRIBUTION_CARDS.map((card, i) => (
                <View key={i} style={[styles.contributionCard, styles.contributionCardLocked, { borderColor: card.color }]}>
                  <Ionicons name="lock-closed-outline" size={22} color={C.gray} />
                  <Text style={styles.contributionCardLockedText}>Únete</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* ── Botón Unirme / Ya unido (estilo "Entrar") ── */}
        {isSubscribed ? (
          <View style={styles.joinedBar}>
            <Ionicons name="checkmark-circle" size={22} color={C.sage} />
            <Text style={styles.joinedBarText}>Ya formas parte de este proyecto</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.joinBtn}
            activeOpacity={0.85}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={styles.joinBtnText}>Unirme al proyecto</Text>
            )}
          </TouchableOpacity>
        )}

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

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Solo flecha (sin subheader completo)
  backOnlyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 24,
  },

  // Hero: título + estado + métricas
  heroSection: {
    gap: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  heroTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
    color: C.forest,
    flex: 1,
    lineHeight: 28,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  pillActive: { backgroundColor: 'rgba(158,179,109,0.18)' },
  pillInactive: { backgroundColor: 'rgba(160,157,154,0.15)' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { backgroundColor: C.sage },
  dotInactive: { backgroundColor: C.gray },
  statusText: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
  statusTextActive: { color: '#5A7A35' },
  statusTextInactive: { color: C.gray },

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

  // Contribuciones: scroll horizontal
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

  // Botón Unirme — estilo "Entrar"
  joinBtn: {
    width: '100%',
    backgroundColor: C.earth,
    borderRadius: 18,
    paddingVertical: 30,
    alignItems: 'center',
    shadowColor: C.earth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  joinBtnText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 20,
    color: C.white,
  },
  joinedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.cardBg,
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: C.sage,
  },
  joinedBarText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: C.sage,
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
});
