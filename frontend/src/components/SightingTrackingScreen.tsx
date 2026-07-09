import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authStore } from '../utils/authStore';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihcobservatorio2-202625.onrender.com';

// ── Paleta ─────────────────────────────────────────────
const C = {
  bg: '#FFFFFF',
  pageBg: '#F6F6F6',
  forest: '#1E2A21',
  earth: '#4A3F35',
  sage: '#9EB36D',
  white: '#FFFFFF',
  gray: '#A09D9A',
  border: '#E8E8E8',
  yellow: '#E6B800',
  yellowBg: '#FFF8DB',
  green: '#4CAF50',
  greenBg: '#E8F5E9',
  red: '#E53935',
  redBg: '#FFEBEE',
  grayCircle: '#C0BDba',
  lineColor: '#DDDBD8',
};

export interface TrackingSighting {
  id: string;
  photo_url?: string;
  preliminary_species?: string;
  status: 'pending' | 'in_review' | 'validated' | 'rejected';
  observed_at: string;
  updated_at?: string;
  created_at?: string;
}

interface SightingTrackingScreenProps {
  sighting: TrackingSighting;
  onBack: () => void;
}

// ── Definición de pasos del pipeline ──────────────────
type StepState = 'done' | 'current' | 'future';

interface PipelineStep {
  key: string;
  label: string;
  sublabel?: string;
}

const PIPELINE: PipelineStep[] = [
  { key: 'draft',     label: 'Borrador' },
  { key: 'pending',   label: 'En espera' },
  { key: 'review',    label: 'En revisión' },
  { key: 'final',     label: 'Publicada' },
];

function getStepIndex(status: string): number {
  switch (status) {
    case 'pending':   return 1;
    case 'in_review': return 2;
    case 'validated': return 3;
    case 'rejected':  return 3;
    default:          return 0;
  }
}

function getStepState(stepIdx: number, currentIdx: number): StepState {
  if (stepIdx < currentIdx) return 'done';
  if (stepIdx === currentIdx) return 'current';
  return 'future';
}

// ── Color del paso actual ──────────────────────────────
function getStepColor(status: string, stepIdx: number, currentIdx: number): string {
  const state = getStepState(stepIdx, currentIdx);
  if (state === 'future') return C.grayCircle;
  if (state === 'done') return C.grayCircle;

  // Estado actual:
  if (status === 'validated') return C.green;
  if (status === 'rejected') return C.red;
  return C.yellow;  // pending o in_review
}

// ── Formatear fecha ────────────────────────────────────
function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const day = d.toLocaleDateString('es-VE', { weekday: 'short' });
  const mon = d.toLocaleDateString('es-VE', { month: 'short', day: '2-digit' });
  const hr  = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  return `${day.charAt(0).toUpperCase() + day.slice(1)} - ${mon}, ${hr}`;
}

export default function SightingTrackingScreen({
  sighting: initialSighting,
  onBack,
}: SightingTrackingScreenProps) {
  const insets = useSafeAreaInsets();

  const [sighting, setSighting]         = useState<TrackingSighting>(initialSighting);
  const [loading, setLoading]           = useState(true);
  const [appealNote, setAppealNote]     = useState('');
  const [sendingAppeal, setSendingAppeal] = useState(false);
  const [userRole, setUserRole]         = useState<string>('');

  // Animación de pulso para el círculo del paso actual
  const pulse = useRef(new Animated.Value(1)).current;

  // ── Pulso del paso activo ────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.22, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.00, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Cargar detalle del avistamiento y rol de usuario ─
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const { token, user } = await authStore.getSession();
        if (user?.role) setUserRole(user.role.toLowerCase());

        const res = await fetch(`${API_URL}/sightings/${initialSighting.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setSighting({ ...initialSighting, ...data });
        }
      } catch {}
      setLoading(false);
    };
    fetchDetail();
  }, [initialSighting.id]);

  // ── Apelar avistamiento ──────────────────────────────
  const handleAppeal = async () => {
    if (!appealNote.trim()) {
      Alert.alert('Agrega una nota', 'Explica el motivo de la apelación antes de enviar.');
      return;
    }
    setSendingAppeal(true);
    try {
      const { token } = await authStore.getSession();
      const res = await fetch(`${API_URL}/sightings/${sighting.id}/appeal`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: appealNote }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSighting((prev) => ({
          ...prev,
          status: 'in_review',
          updated_at: new Date().toISOString(),
          ...updated.sighting,
        }));
        setAppealNote('');
        Alert.alert('Enviado', 'Tu apelación fue enviada. Los expertos la revisarán.');
      } else {
        Alert.alert('Error', 'No se pudo enviar la apelación.');
      }
    } catch {
      Alert.alert('Error', 'Verifica tu conexión e intenta de nuevo.');
    } finally {
      setSendingAppeal(false);
    }
  };

  const currentIdx = getStepIndex(sighting.status);
  const lastUpdated = sighting.updated_at || sighting.created_at;

  // ── Etiqueta del último paso (Publicada o Rechazada) ─
  const finalLabel = sighting.status === 'rejected' ? 'Rechazada' : 'Publicada';
  const steps = [
    ...PIPELINE.slice(0, 3),
    { key: 'final', label: finalLabel },
  ];

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator size="large" color={C.sage} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 12 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Cabecera ── */}
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={C.earth} />
          </TouchableOpacity>
        </View>

        <Text style={styles.pageTitle}>Revisa el estado de tu publicación</Text>

        {/* ── Fecha del último cambio de estado ── */}
        <Text style={styles.dateLabel}>{formatDateTime(lastUpdated)}</Text>

        {/* ── Foto miniatura ── */}
        {sighting.photo_url ? (
          <Image
            source={{ uri: sighting.photo_url }}
            style={styles.photoThumb}
            resizeMode="cover"
          />
        ) : null}

        {/* ── Timeline ── */}
        <View style={styles.timeline}>
          {steps.map((step, idx) => {
            const state = getStepState(idx, currentIdx);
            const isLast = idx === steps.length - 1;
            const isCurrent = state === 'current';
            const isDone = state === 'done';

            // Color dinámico
            const circleColor = getStepColor(sighting.status, idx, currentIdx);
            const isFinalRejected = idx === 3 && sighting.status === 'rejected';
            const isFinalValidated = idx === 3 && sighting.status === 'validated';

            return (
              <View key={step.key} style={styles.stepRow}>
                {/* Columna izquierda: círculo + línea */}
                <View style={styles.stepLeft}>
                  {/* Círculo animado si es el paso actual */}
                  {isCurrent ? (
                    <Animated.View style={[
                      styles.circleOuter,
                      { borderColor: circleColor, transform: [{ scale: pulse }] },
                    ]}>
                      <View style={[styles.circleInner, { backgroundColor: circleColor }]} />
                    </Animated.View>
                  ) : isDone ? (
                    <View style={[styles.circleFilled, { backgroundColor: circleColor }]}>
                      <Ionicons name="checkmark" size={12} color={C.white} />
                    </View>
                  ) : (
                    <View style={[styles.circleEmpty, { borderColor: isFinalRejected ? C.red : isFinalValidated ? C.green : C.lineColor }]} />
                  )}

                  {/* Línea vertical (excepto en el último) */}
                  {!isLast && (
                    <View style={[
                      styles.stepLine,
                      { backgroundColor: isDone ? C.grayCircle : C.lineColor },
                    ]} />
                  )}
                </View>

                {/* Columna derecha: contenido del paso */}
                <View style={styles.stepRight}>
                  {/* Borrador: muestra una card con hora */}
                  {idx === 0 ? (
                    <View style={styles.draftCard}>
                      <Text style={styles.draftCardLabel}>Borrador</Text>
                      <Text style={styles.draftCardTime}>
                        {new Date(sighting.created_at ?? sighting.observed_at).toLocaleTimeString('es-VE', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[
                      styles.stepLabel,
                      isCurrent && { fontFamily: 'Poppins_600SemiBold', color: C.earth },
                      state === 'future' && { color: C.gray },
                      isFinalRejected && { color: C.red },
                      isFinalValidated && { color: C.green },
                    ]}>
                      {step.label}
                    </Text>
                  )}

                  {/* Hora del paso actual */}
                  {isCurrent && idx > 0 && (
                    <Text style={styles.stepTime}>
                      {new Date(sighting.updated_at ?? sighting.observed_at).toLocaleTimeString('es-VE', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  )}

                  {/* Cuando está en revisión: panel de discusión */}
                  {isCurrent && sighting.status === 'in_review' && (
                    <View style={styles.reviewPanel}>
                      <View style={styles.reviewBadge}>
                        <Ionicons name="people" size={14} color={C.yellow} />
                        <Text style={styles.reviewBadgeText}>Los expertos están revisando</Text>
                      </View>
                      <Text style={styles.reviewInfo}>
                        Un especialista ha abierto una discusión sobre este avistamiento.
                        Puedes agregar una nota con contexto adicional.
                      </Text>

                      <TextInput
                        style={styles.appealInput}
                        placeholder="Agrega contexto adicional para los especialistas..."
                        placeholderTextColor={C.gray}
                        value={appealNote}
                        onChangeText={setAppealNote}
                        multiline
                        maxLength={500}
                      />
                      <TouchableOpacity
                        style={[styles.appealBtn, sendingAppeal && { opacity: 0.6 }]}
                        onPress={handleAppeal}
                        activeOpacity={0.85}
                        disabled={sendingAppeal}
                      >
                        {sendingAppeal ? (
                          <ActivityIndicator color={C.white} />
                        ) : (
                          <>
                            <Ionicons name="send" size={16} color={C.white} />
                            <Text style={styles.appealBtnText}>Enviar nota</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Estado rechazado: opción de apelar */}
                  {sighting.status === 'rejected' && idx === 3 && (
                    <View style={styles.rejectedPanel}>
                      <View style={styles.rejectedBadge}>
                        <Ionicons name="close-circle" size={14} color={C.red} />
                        <Text style={styles.rejectedBadgeText}>Avistamiento rechazado</Text>
                      </View>
                      <Text style={styles.reviewInfo}>
                        Un especialista rechazó este avistamiento. Puedes apelar si crees
                        que la decisión fue incorrecta.
                      </Text>

                      <TextInput
                        style={styles.appealInput}
                        placeholder="¿Por qué crees que debe revisarse?"
                        placeholderTextColor={C.gray}
                        value={appealNote}
                        onChangeText={setAppealNote}
                        multiline
                        maxLength={500}
                      />
                      <TouchableOpacity
                        style={[styles.appealBtn, styles.appealBtnRed, sendingAppeal && { opacity: 0.6 }]}
                        onPress={handleAppeal}
                        activeOpacity={0.85}
                        disabled={sendingAppeal}
                      >
                        {sendingAppeal ? (
                          <ActivityIndicator color={C.white} />
                        ) : (
                          <>
                            <Ionicons name="flag" size={16} color={C.white} />
                            <Text style={styles.appealBtnText}>Apelar decisión</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Estado validado: confirmación */}
                  {sighting.status === 'validated' && idx === 3 && (
                    <View style={styles.validatedPanel}>
                      <Ionicons name="checkmark-circle" size={18} color={C.green} />
                      <Text style={styles.validatedText}>
                        ¡Tu avistamiento fue verificado y publicado en la comunidad!
                      </Text>
                    </View>
                  )}

                  <View style={{ height: 28 }} />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const CIRCLE = 22;
const LINE_WIDTH = 2;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },

  // ── Cabecera ─────────────────────────────────────────
  pageHeader: {
    marginBottom: 8,
  },
  backBtn: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  pageTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: C.forest,
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 26,
  },
  dateLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.earth,
    marginBottom: 18,
  },
  photoThumb: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginBottom: 28,
    backgroundColor: C.border,
  },

  // ── Timeline ─────────────────────────────────────────
  timeline: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // ── Columna izquierda (círculo + línea) ──────────────
  stepLeft: {
    width: CIRCLE + 8,
    alignItems: 'center',
  },

  // Círculo para paso actual (animado, con borde)
  circleOuter: {
    width: CIRCLE + 6,
    height: CIRCLE + 6,
    borderRadius: (CIRCLE + 6) / 2,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Círculo lleno para pasos completados
  circleFilled: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Círculo vacío para pasos futuros
  circleEmpty: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 2,
  },

  stepLine: {
    width: LINE_WIDTH,
    flex: 1,
    minHeight: 40,
    marginTop: 2,
  },

  // ── Columna derecha (texto y contenido) ──────────────
  stepRight: {
    flex: 1,
    paddingLeft: 16,
    paddingTop: 2,
  },
  stepLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: C.earth,
  },
  stepTime: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.gray,
    marginTop: 2,
  },

  // ── Card de Borrador ──────────────────────────────────
  draftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EDEBE9',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    width: '90%',
  },
  draftCardLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: C.earth,
  },
  draftCardTime: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.gray,
  },

  // ── Panel de Revisión (in_review) ──────────────────
  reviewPanel: {
    backgroundColor: C.yellowBg,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    gap: 10,
    width: '95%',
  },
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: C.yellow,
  },
  reviewInfo: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.earth,
    lineHeight: 19,
  },

  // ── Panel Rechazado ───────────────────────────────────
  rejectedPanel: {
    backgroundColor: C.redBg,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    gap: 10,
    width: '95%',
  },
  rejectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rejectedBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: C.red,
  },

  // ── Campo de apelación ───────────────────────────────
  appealInput: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 12,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.earth,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: C.border,
  },
  appealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.earth,
    borderRadius: 20,
    paddingVertical: 12,
  },
  appealBtnRed: {
    backgroundColor: C.red,
  },
  appealBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.white,
  },

  // ── Panel Validado ────────────────────────────────────
  validatedPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.greenBg,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    width: '95%',
  },
  validatedText: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.forest,
    lineHeight: 19,
  },
});
