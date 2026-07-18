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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  yellowBg: '#FFF8E6',
  yellow: '#E6A817',
};

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

  const daysActive = Math.max(
    0,
    Math.floor((Date.now() - new Date(detail.start_date).getTime()) / (1000 * 60 * 60 * 24))
  );
  const daysLeft = Math.max(
    0,
    Math.floor((new Date(detail.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  // ── Cargar detalles completos del proyecto ─────────────
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

  // ── Unirse al proyecto ─────────────────────────────────
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

  // ── Encuesta: responder una pregunta (UI local) ────────
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const questions: any[] = Array.isArray(detail.survey_questions) ? detail.survey_questions : [];

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={C.earth} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Cargando proyecto...</Text>
        </View>
        <ProjectDetailSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.earth} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{detail.title}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Bloque de métricas rápidas ── */}
        <View style={styles.metricsRow}>
          <MetricCard
            icon="calendar-outline"
            value={`${daysActive}d`}
            label="Activo"
          />
          <MetricCard
            icon="time-outline"
            value={`${daysLeft}d`}
            label="Restantes"
          />
          <MetricCard
            icon="help-circle-outline"
            value={`${questions.length}`}
            label="Encuestas"
          />
        </View>

        {/* ── Nombre y descripción ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.bodyText}>{detail.description}</Text>
        </View>

        {/* ── Métodos / Metas ── */}
        {detail.methods ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metodología & Metas</Text>
            <Text style={styles.bodyText}>{detail.methods}</Text>
          </View>
        ) : null}

        {/* ── Fechas ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Período</Text>
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
              <Ionicons name="stop-outline" size={14} color={C.earth} />
              <Text style={styles.dateText}>
                Cierre: {new Date(detail.end_date).toLocaleDateString('es-VE', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Encuestas ── */}
        {questions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Encuestas a responder
              <Text style={styles.sectionCount}> ({questions.length})</Text>
            </Text>

            {questions.map((q: any, idx: number) => (
              <View key={idx} style={styles.questionCard}>
                <Text style={styles.questionText}>
                  {idx + 1}. {typeof q === 'string' ? q : (q.question ?? q.text ?? JSON.stringify(q))}
                </Text>

                {/* Si tiene opciones (opción múltiple) */}
                {Array.isArray(q.options) && q.options.length > 0 ? (
                  <View style={styles.optionsWrap}>
                    {q.options.map((opt: string, oi: number) => (
                      <TouchableOpacity
                        key={oi}
                        style={[
                          styles.optionBtn,
                          answers[idx] === opt && styles.optionBtnSelected,
                        ]}
                        activeOpacity={0.75}
                        onPress={() => setAnswers((prev) => ({ ...prev, [idx]: opt }))}
                      >
                        <Text style={[
                          styles.optionText,
                          answers[idx] === opt && styles.optionTextSelected,
                        ]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  /* Respuesta libre */
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

        {/* ── Publicaciones (contribuciones) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Publicaciones</Text>
          <View style={styles.publicationsPlaceholder}>
            <MaterialCommunityIcons name="binoculars" size={28} color={C.sage} />
            <Text style={styles.publicationsHint}>
              {isSubscribed
                ? 'Las contribuciones del proyecto aparecerán aquí.'
                : 'Únete al proyecto para ver las publicaciones.'}
            </Text>
          </View>
        </View>

        {/* ── Relleno inferior ── */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Botón flotante Unirme / Ya unido ── */}
      <View style={[styles.fabWrap, { paddingBottom: insets.bottom + 16 }]}>
        {isSubscribed ? (
          <View style={styles.joinedBar}>
            <Ionicons name="checkmark-circle" size={20} color={C.sage} />
            <Text style={styles.joinedBarText}>Ya formas parte de este proyecto</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.joinFab}
            activeOpacity={0.85}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color={C.white} />
                <Text style={styles.joinFabText}>Unirme al proyecto</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Sub-componente de métrica ──────────────────────────
function MetricCard({ icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <View style={metStyles.card}>
      <Ionicons name={icon} size={20} color={C.sage} />
      <Text style={metStyles.value}>{value}</Text>
      <Text style={metStyles.label}>{label}</Text>
    </View>
  );
}

const metStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.cardBg,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  value: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    color: C.forest,
  },
  label: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: C.gray,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },

  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    color: C.forest,
    flex: 1,
  },

  // ── Scroll ──────────────────────────────────────────────
  scrollContent: {
    padding: 20,
    gap: 20,
  },

  // ── Métricas ────────────────────────────────────────────
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  // ── Secciones ───────────────────────────────────────────
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: C.forest,
  },
  sectionCount: {
    fontFamily: 'Poppins_400Regular',
    color: C.gray,
  },
  bodyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.earth,
    lineHeight: 22,
  },

  // ── Fechas ──────────────────────────────────────────────
  datesRow: { gap: 8 },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.cardBg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dateText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.earth,
  },

  // ── Encuestas ────────────────────────────────────────────
  questionCard: {
    backgroundColor: C.cardBg,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
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

  // ── Publicaciones ────────────────────────────────────────
  publicationsPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.cardBg,
    borderRadius: 14,
    padding: 16,
  },
  publicationsHint: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.gray,
    lineHeight: 18,
  },

  // ── FAB Unirme ───────────────────────────────────────────
  fabWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  joinFab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.earth,
    borderRadius: 28,
    paddingVertical: 17,
    shadowColor: C.earth,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  joinFabText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: C.white,
  },
  joinedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.cardBg,
    borderRadius: 28,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: C.sage,
  },
  joinedBarText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: C.sage,
  },
});
