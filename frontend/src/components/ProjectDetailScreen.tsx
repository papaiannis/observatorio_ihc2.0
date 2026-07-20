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
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../utils/authStore';
import type { Investigation } from './ProjectListScreen';
import { ProjectDetailSkeleton } from './Skeleton';
import ExportButton from './ExportButton';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihcobservatorio2-202625.onrender.com';

const C = {
  bg: '#F6F6F6',
  cardBg: '#FFFFFF',
  white: '#FFFFFF',
  border: '#E8E8E8',
  sage: '#9EB36D',
  sageBg: 'rgba(158,179,109,0.12)',
  textColor: '#473C33', // Color de tipografía unificado
};

interface ProjectDetailScreenProps {
  project: Investigation;
  onBack: () => void;
  isSubscribed: boolean;
  onSubscribedChange: (id: string, joined: boolean) => void;
  isGuest?: boolean;
  onOpenUploadForm?: (projectId: string, answers?: Record<number, string>) => void;
  userRole?: string;
  currentUserId?: string;
}

export default function ProjectDetailScreen({
  project,
  onBack,
  isSubscribed,
  onSubscribedChange,
  isGuest = false,
  onOpenUploadForm,
  userRole,
  currentUserId,
}: ProjectDetailScreenProps) {
  const [detail, setDetail] = useState<Investigation>(project);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [contributions, setContributions] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [surveysExpanded, setSurveysExpanded] = useState(false);
  const [submittingAnswers, setSubmittingAnswers] = useState(false);

  // Estados para modal de edición del Especialista (Funcionalidad 5 y 6)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editToolsUrl, setEditToolsUrl] = useState('');
  const [editQuestions, setEditQuestions] = useState<any[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionOptions, setNewQuestionOptions] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const isEspecialista = userRole?.toLowerCase() === 'especialista' || detail.created_by === currentUserId;

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
          setEditTitle(data.title || '');
          setEditDesc(data.description || '');
          setEditToolsUrl(data.tools_url || '');
          setEditQuestions(Array.isArray(data.survey_questions) ? data.survey_questions : []);
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

        {/* ── MÉTRICAS: "Dias N" justificado a la izquierda ── */}
        <View style={styles.metricContainerLeft}>
          <Text style={styles.metricText}>
            <Text style={styles.metricDaysText}>Dias </Text>
            <Text style={styles.metricNumberText}>{daysActive}</Text>
          </Text>
        </View>

        {/* ── BOTÓN DE EXPORTACIÓN DEL PROYECTO (Dataset Científico) ── */}
        <View style={[styles.section, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 2 }]}>Dataset del Proyecto</Text>
            <Text style={{ fontSize: 12, color: C.textColor, opacity: 0.8 }}>Descarga todas las observaciones o solo las validadas en CSV/Excel</Text>
          </View>
          <ExportButton
            mode="project"
            id={project.id}
            buttonVariant="pill"
            label="Exportar"
          />
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

        {/* ── ENCUESTAS EXPANDIBLES Y GOOGLE FORMS ── */}
        {(questions.length > 0 || detail.tools_url || isEspecialista) && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.expandableHeader}
              onPress={() => setSurveysExpanded(!surveysExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>Encuestas y Formulario</Text>
              <View style={styles.expandableHeaderRight}>
                {questions.length > 0 && <Text style={styles.sectionCount}>({questions.length})</Text>}
                <Ionicons
                  name={surveysExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={C.textColor}
                />
              </View>
            </TouchableOpacity>

            {surveysExpanded && (
              <View style={styles.expandedContent}>
                {/* Enlace de Google Forms (Funcionalidad 6) */}
                {detail.tools_url ? (
                  <TouchableOpacity
                    style={styles.googleFormBtn}
                    onPress={() => Linking.openURL(detail.tools_url!)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="document-text" size={20} color={C.white} />
                    <Text style={styles.googleFormBtnText}>Responder en Google Forms</Text>
                    <Ionicons name="open-outline" size={16} color={C.white} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                ) : null}

                {/* Preguntas locales de encuesta (Funcionalidad 4) */}
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
                        <TextInput
                          style={styles.freeAnswerInput}
                          placeholder="Escribe tu respuesta aquí..."
                          placeholderTextColor="#999"
                          value={answers[idx] || ''}
                          onChangeText={(text) => setAnswers((prev) => ({ ...prev, [idx]: text }))}
                        />
                      </View>
                    )}
                  </View>
                ))}

                {/* Botones de acción para enviar respuestas (Funcionalidad 4 y 3) */}
                {questions.length > 0 && (
                  <View style={styles.surveyActionContainer}>
                    <TouchableOpacity
                      style={styles.surveyUploadBtn}
                      onPress={() => {
                        if (onOpenUploadForm) {
                          onOpenUploadForm(project.id, answers);
                        } else {
                          Alert.alert('Información', 'Toma una foto para adjuntar estas respuestas al proyecto.');
                        }
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="camera" size={18} color={C.white} />
                      <Text style={styles.surveyActionText}>Subir Avistamiento con Respuestas</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.surveySaveBtn, submittingAnswers && { opacity: 0.6 }]}
                      disabled={submittingAnswers}
                      onPress={async () => {
                        if (isGuest) {
                          Alert.alert('Inicia sesión', 'Crea una cuenta para enviar respuestas.');
                          return;
                        }
                        if (Object.keys(answers).length === 0) {
                          Alert.alert('Atención', 'Responde al menos una pregunta antes de guardar.');
                          return;
                        }
                        setSubmittingAnswers(true);
                        try {
                          const { token } = await authStore.getSession();
                          const res = await fetch(`${API_URL}/api/v1/investigations/${project.id}/survey-answers`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ answers }),
                          });
                          if (res.ok) {
                            Alert.alert('¡Respuestas Registradas!', 'Tus respuestas han sido enviadas y vinculadas al proyecto.');
                          } else {
                            const err = await res.json().catch(() => ({}));
                            Alert.alert('Error', err.message ?? 'No se pudo registrar.');
                          }
                        } catch {
                          Alert.alert('Error', 'Verifica tu conexión a internet.');
                        } finally {
                          setSubmittingAnswers(false);
                        }
                      }}
                      activeOpacity={0.85}
                    >
                      {submittingAnswers ? (
                        <ActivityIndicator color={C.textColor} size="small" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={18} color={C.textColor} />
                          <Text style={[styles.surveyActionText, { color: C.textColor }]}>Enviar Solo Respuestas</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Botón exclusivo de Especialistas para modificar preguntas/forms (Funcionalidad 5 y 6) */}
                {isEspecialista && (
                  <TouchableOpacity
                    style={styles.specialistEditBtn}
                    onPress={() => {
                      setEditTitle(detail.title || '');
                      setEditDesc(detail.description || '');
                      setEditToolsUrl(detail.tools_url || '');
                      setEditQuestions(Array.isArray(detail.survey_questions) ? [...detail.survey_questions] : []);
                      setShowEditModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="create-outline" size={18} color={C.white} />
                    <Text style={styles.specialistEditBtnText}>Editar Preguntas y Google Forms (Especialista)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── BOTÓN FLOTANTE SIN RECUADRO (Posicionado sobre el footer) ── */}
      {joining ? (
        <View style={styles.floatingRoundBtn}>
          <ActivityIndicator color={C.white} size="small" />
        </View>
      ) : (
        <TouchableOpacity
          style={styles.floatingRoundBtn}
          onPress={() => {
            if (isSubscribed && onOpenUploadForm) {
              onOpenUploadForm(project.id, answers);
            } else {
              handleJoin();
            }
          }}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isSubscribed ? "camera" : "add-sharp"}
            size={26}
            color={C.white}
          />
        </TouchableOpacity>
      )}

      {/* ── MODAL DE CURADURÍA/EDICIÓN PARA EL ESPECIALISTA ── */}
      <Modal visible={showEditModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Proyecto (Especialista)</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={C.textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Título del Proyecto</Text>
              <TextInput
                style={styles.textInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Título"
              />

              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="Descripción"
                multiline
              />

              <Text style={styles.inputLabel}>Link de Google Forms (Encuesta Externa)</Text>
              <TextInput
                style={styles.textInput}
                value={editToolsUrl}
                onChangeText={setEditToolsUrl}
                placeholder="https://docs.google.com/forms/d/..."
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Preguntas Locales Activas ({editQuestions.length})</Text>
              {editQuestions.map((q, i) => (
                <View key={i} style={styles.editQuestionRow}>
                  <Text style={styles.editQuestionText} numberOfLines={2}>
                    {i + 1}. {typeof q === 'string' ? q : q.question ?? q.text}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setEditQuestions(editQuestions.filter((_, idx) => idx !== i))}
                    style={styles.deleteQBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color="#E57373" />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.newQuestionBox}>
                <Text style={styles.subLabel}>Añadir Nueva Pregunta</Text>
                <TextInput
                  style={styles.textInput}
                  value={newQuestionText}
                  onChangeText={setNewQuestionText}
                  placeholder="Ej: ¿Qué comportamiento observó?"
                />
                <TextInput
                  style={[styles.textInput, { marginTop: 8 }]}
                  value={newQuestionOptions}
                  onChangeText={setNewQuestionOptions}
                  placeholder="Opciones separadas por coma (opcional)"
                />
                <TouchableOpacity
                  style={styles.addQBtn}
                  onPress={() => {
                    if (!newQuestionText.trim()) return;
                    const opts = newQuestionOptions.split(',').map(o => o.trim()).filter(Boolean);
                    const newQ = opts.length > 0
                      ? { question: newQuestionText.trim(), options: opts }
                      : { question: newQuestionText.trim() };
                    setEditQuestions([...editQuestions, newQ]);
                    setNewQuestionText('');
                    setNewQuestionOptions('');
                  }}
                >
                  <Ionicons name="add-circle" size={18} color={C.white} />
                  <Text style={styles.addQText}>Agregar Pregunta</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveModalBtn, savingEdit && { opacity: 0.6 }]}
              disabled={savingEdit}
              onPress={async () => {
                setSavingEdit(true);
                try {
                  const { token } = await authStore.getSession();
                  const res = await fetch(`${API_URL}/api/v1/investigations/${project.id}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      title: editTitle.trim(),
                      description: editDesc.trim(),
                      tools_url: editToolsUrl.trim() || null,
                      survey_questions: editQuestions,
                    }),
                  });
                  if (res.ok) {
                    const updated = await res.json();
                    setDetail(updated);
                    setShowEditModal(false);
                    Alert.alert('¡Actualizado!', 'Las preguntas y datos del proyecto fueron guardados.');
                  } else {
                    const err = await res.json().catch(() => ({}));
                    Alert.alert('Error', err.message ?? 'No se pudieron guardar los cambios.');
                  }
                } catch {
                  Alert.alert('Error', 'Verifica tu conexión a internet.');
                } finally {
                  setSavingEdit(false);
                }
              }}
            >
              {savingEdit ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Text style={styles.saveModalText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, position: 'relative' },
  backOnlyBtn: { padding: 16 },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 110, // Aumentado para evitar que el contenido final quede tapado por el botón flotante y el footer
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

  // ── Métrica: "Dias N" justificado a la izquierda ──
  metricContainerLeft: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: 4,
  },
  metricText: {
    color: C.textColor,
  },
  metricDaysText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
  },
  metricNumberText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
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
    paddingVertical: 4,
  },
  freeAnswerInput: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.textColor,
    paddingVertical: 6,
  },

  // ── Botón Flotante libre (Sin recuadro, sobre el footer) ──
  floatingRoundBtn: {
    position: 'absolute',
    right: 24,
    bottom: 85,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.textColor,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },

  // ── Nuevos estilos de botones y modales para encuestas / forms / edición ──
  googleFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34A853',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 8,
  },
  googleFormBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: C.white,
  },
  surveyActionContainer: {
    gap: 10,
    marginTop: 12,
  },
  surveyUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.sage,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  surveySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: C.textColor,
    paddingVertical: 11,
    borderRadius: 14,
    gap: 8,
  },
  surveyActionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: C.white,
  },
  specialistEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.textColor,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 16,
    gap: 8,
  },
  specialistEditBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: C.white,
  },

  // ── Modal Especialista ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: C.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 18,
    color: C.textColor,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: C.textColor,
    marginTop: 12,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.textColor,
  },
  editQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bg,
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  editQuestionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.textColor,
    flex: 1,
  },
  deleteQBtn: {
    paddingLeft: 10,
  },
  newQuestionBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#F9F9F9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  subLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: C.textColor,
    marginBottom: 8,
  },
  addQBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.sage,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
    gap: 6,
  },
  addQText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: C.white,
  },
  saveModalBtn: {
    backgroundColor: C.textColor,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveModalText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.white,
  },
});
