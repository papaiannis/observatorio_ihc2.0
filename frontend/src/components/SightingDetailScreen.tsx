import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authStore } from '../utils/authStore';

const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihc-2-0.onrender.com';

const C = {
  bg: '#F6F6F6',
  white: '#FFFFFF',
  forest: '#1E2A21',
  earth: '#4A3F35',
  sage: '#9EB36D',
  gray: '#A09D9A',
  border: '#E8E8E8',
  green: '#4CAF50',
  greenBg: '#E8F5E9',
  yellow: '#FFB300',
  yellowBg: '#FFF8E1',
  red: '#EF5350',
  redBg: '#FFEBEE',
  brown: '#8D6E63',
  brownBg: '#EFEBE9',
};

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user?: {
    username: string;
    avatar_url?: string;
  };
}

interface Sighting {
  id: string;
  photo_url: string;
  preliminary_species?: string;
  observed_at: string;
  status: 'pending' | 'validated' | 'rejected' | 'in_review';
  decimal_latitude?: number;
  decimal_longitude?: number;
  profiles?: { username: string; avatar_url?: string };
  species?: { scientific_name: string; common_name?: string };
}

interface SightingDetailScreenProps {
  sightingId: string;
  initialSighting?: Sighting;
  onBack: () => void;
}

export default function SightingDetailScreen({ sightingId, initialSighting, onBack }: SightingDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const [sighting, setSighting] = useState<Sighting | null>(initialSighting || null);
  const [loading, setLoading] = useState(!initialSighting);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Likes
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [togglingLike, setTogglingLike] = useState(false);

  // Slide Animation (deslizar desde la derecha para fluidez total)
  const slideAnim = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    // Animación de entrada
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 60,
      friction: 9,
      useNativeDriver: true,
    }).start();
  }, []);

  // Cargar datos del avistamiento, likes y comentarios
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { token } = await authStore.getSession();
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        // 1. Obtener detalles del avistamiento si no se pasaron inicialmente
        if (!initialSighting) {
          const res = await fetch(`${API_URL}/api/v1/sightings/feed`, { headers });
          if (res.ok) {
            const data = await res.json();
            const found = (data.sightings || []).find((s: Sighting) => s.id === sightingId);
            if (found) setSighting(found);
          }
        }

        // 2. Obtener comentarios
        const commRes = await fetch(`${API_URL}/api/v1/comments?sighting_id=${sightingId}`);
        if (commRes.ok) {
          const data = await commRes.json();
          setComments(data.comments || []);
        }

        // 3. Obtener contador de likes
        const likeRes = await fetch(`${API_URL}/api/v1/likes/count?sighting_id=${sightingId}`);
        if (likeRes.ok) {
          const data = await likeRes.json();
          setLikeCount(data.count || 0);
        }
      } catch (e) {
        console.warn('Error al cargar datos del avistamiento:', e);
      } finally {
        setLoading(false);
        setLoadingComments(false);
      }
    };

    fetchData();
  }, [sightingId]);

  const handleBack = () => {
    Animated.timing(slideAnim, {
      toValue: width,
      duration: 250,
      useNativeDriver: true,
    }).start(onBack);
  };

  // ── Toggle Like ─────────────────────────────────────────
  const handleToggleLike = async () => {
    if (togglingLike) return;
    try {
      const { token } = await authStore.getSession();
      if (!token) {
        Alert.alert('Acceso Requerido', 'Inicia sesión para darle like a los avistamientos.');
        return;
      }

      setTogglingLike(true);
      // Optimistic update
      setLiked(!liked);
      setLikeCount(prev => (liked ? prev - 1 : prev + 1));

      const res = await fetch(`${API_URL}/api/v1/likes/toggle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sighting_id: sightingId }),
      });

      if (!res.ok) {
        // Revertir en caso de error
        setLiked(liked);
        setLikeCount(prev => (liked ? prev + 1 : prev - 1));
      }
    } catch {
      setLiked(liked);
    } finally {
      setTogglingLike(false);
    }
  };

  // ── Enviar Comentario ────────────────────────────────────
  const handleSendComment = async () => {
    if (!newComment.trim() || submittingComment) return;
    try {
      const { token, user } = await authStore.getSession();
      if (!token) {
        Alert.alert('Acceso Requerido', 'Inicia sesión para poder comentar.');
        return;
      }

      setSubmittingComment(true);

      const res = await fetch(`${API_URL}/api/v1/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sighting_id: sightingId,
          content: newComment.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Agregar localmente
        const added: Comment = {
          id: data.id || Math.random().toString(),
          content: newComment.trim(),
          created_at: new Date().toISOString(),
          user: {
            username: user?.nombre || user?.username || 'Yo',
            avatar_url: user?.avatar_url,
          },
        };
        setComments(prev => [added, ...prev]);
        setNewComment('');
      } else {
        Alert.alert('Error', 'No se pudo enviar el comentario.');
      }
    } catch {
      Alert.alert('Error', 'Error de red.');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading || !sighting) {
    return (
      <View style={[styles.loadingRoot, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={C.sage} />
      </View>
    );
  }

  // Estilo de estados
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'validated':
        return { bg: C.greenBg, text: C.green, label: 'Validado' };
      case 'in_review':
        return { bg: C.brownBg, text: C.brown, label: 'En revisión' };
      case 'rejected':
        return { bg: C.redBg, text: C.red, label: 'Rechazado' };
      default:
        return { bg: C.yellowBg, text: C.yellow, label: 'Pendiente' };
    }
  };

  const statusStyle = getStatusStyle(sighting.status);
  const username = sighting.profiles?.username || 'Anónimo';
  const speciesObj = sighting.species;
  const showSpeciesName = sighting.status === 'validated' && speciesObj;

  const dateStr = new Date(sighting.observed_at).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Imagen de Portada Full Width */}
          <View style={styles.imageWrapper}>
            <Image source={{ uri: sighting.photo_url }} style={styles.sightingImage} resizeMode="cover" />
            
            {/* Botón flotante de regreso */}
            <TouchableOpacity onPress={handleBack} style={styles.floatingBackBtn} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={22} color={C.earth} />
            </TouchableOpacity>
            
            {/* Estado Flotante */}
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
            </View>
          </View>

          {/* Información del Avistamiento */}
          <View style={styles.infoContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.speciesTitle}>
                {showSpeciesName ? speciesObj.common_name || speciesObj.scientific_name : sighting.preliminary_species || 'Especie no identificada'}
              </Text>
              
              {/* Botón de Like */}
              <TouchableOpacity
                style={styles.likeBtn}
                onPress={handleToggleLike}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={26}
                  color={liked ? C.red : C.gray}
                />
                <Text style={styles.likeCountText}>{likeCount}</Text>
              </TouchableOpacity>
            </View>

            {showSpeciesName && (
              <Text style={styles.scientificName}>{speciesObj.scientific_name}</Text>
            )}

            {/* Fila de metadatos (Observador, Fecha) */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={16} color={C.gray} />
                <Text style={styles.metaText}>{username}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={C.gray} />
                <Text style={styles.metaText}>{dateStr}</Text>
              </View>
            </View>

            {/* Coordenadas (si están disponibles) */}
            {sighting.decimal_latitude !== null && sighting.decimal_latitude !== undefined && (
              <View style={styles.locationBox}>
                <Ionicons name="location" size={18} color={C.sage} />
                <Text style={styles.locationText}>
                  Coordenadas: {sighting.decimal_latitude.toFixed(5)}, {sighting.decimal_longitude?.toFixed(5)}
                </Text>
              </View>
            )}

            {/* Validado por (Especialista) */}
            {sighting.status === 'validated' && (
              <View style={styles.validatorBox}>
                <Ionicons name="shield-checkmark" size={22} color={C.green} />
                <View style={styles.validatorMeta}>
                  <Text style={styles.validatorTitle}>Validación Científica</Text>
                  <Text style={styles.validatorName}>
                    Validado por: <Text style={styles.boldText}>Dra. Elena Rossi</Text> (Especialista en Botánica)
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ── COMENTARIOS Y PREGUNTAS ── */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Preguntas y Comentarios</Text>

            {loadingComments ? (
              <ActivityIndicator color={C.sage} style={{ marginVertical: 20 }} />
            ) : comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Ionicons name="chatbubbles-outline" size={36} color={C.gray} />
                <Text style={styles.emptyCommentsText}>Nadie ha preguntado aún. ¡Sé el primero!</Text>
              </View>
            ) : (
              <View style={styles.commentsList}>
                {comments.map((comment) => (
                  <View key={comment.id} style={styles.commentCard}>
                    {/* Avatar */}
                    {comment.user?.avatar_url ? (
                      <Image source={{ uri: comment.user.avatar_url }} style={styles.commentAvatar} />
                    ) : (
                      <View style={styles.commentAvatarPlaceholder}>
                        <Ionicons name="person" size={14} color={C.gray} />
                      </View>
                    )}
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentUser}>{comment.user?.username || 'Anónimo'}</Text>
                        <Text style={styles.commentDate}>
                          {new Date(comment.created_at).toLocaleDateString('es-VE', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{comment.content}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Input para Nuevo Comentario al Pie (View normal para evitar duplicar safe-area) */}
        <View style={styles.inputSafeArea}>
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Haz una pregunta o comenta..."
              placeholderTextColor={C.gray}
              value={newComment}
              onChangeText={setNewComment}
              maxLength={240}
              selectionColor={C.sage}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !newComment.trim() && styles.sendBtnDisabled]}
              onPress={handleSendComment}
              disabled={!newComment.trim() || submittingComment}
              activeOpacity={0.7}
            >
              {submittingComment ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <Ionicons name="send" size={16} color={C.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    position: 'relative',
  },
  floatingBackBtn: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  flex: {
    flex: 1,
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSafeArea: {
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: C.earth,
  },
  content: {
    flex: 1,
  },
  imageWrapper: {
    width: '100%',
    height: 250,
    backgroundColor: '#000',
    position: 'relative',
  },
  sightingImage: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  infoContainer: {
    padding: 20,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  speciesTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    color: C.earth,
    flex: 1,
  },
  scientificName: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: C.gray,
    fontStyle: 'italic',
    marginTop: -2,
    marginBottom: 12,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  likeCountText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.earth,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.gray,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  locationText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.earth,
  },
  validatorBox: {
    flexDirection: 'row',
    backgroundColor: C.greenBg,
    padding: 14,
    borderRadius: 16,
    marginTop: 16,
    gap: 12,
  },
  validatorMeta: {
    flex: 1,
  },
  validatorTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.green,
    marginBottom: 2,
  },
  validatorName: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.earth,
    lineHeight: 18,
  },
  boldText: {
    fontFamily: 'Poppins_600SemiBold',
  },

  // Comentarios
  commentsSection: {
    padding: 20,
    backgroundColor: C.bg,
    paddingBottom: 80,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: C.earth,
    marginBottom: 16,
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyCommentsText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.gray,
    textAlign: 'center',
  },
  commentsList: {
    gap: 14,
  },
  commentCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: C.white,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUser: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: C.earth,
  },
  commentDate: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: C.gray,
  },
  commentText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.earth,
    lineHeight: 18,
  },

  // Input de Comentario
  inputSafeArea: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingBottom: 65, // Subir la caja para quedar por encima del footer absoluto
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontFamily: 'Poppins_400Regular',
    fontSize: 13.5,
    color: C.earth,
    maxHeight: 80,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: C.gray,
  },
});
