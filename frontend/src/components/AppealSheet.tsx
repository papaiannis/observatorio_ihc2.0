/**
 * AppealSheet.tsx
 *
 * Bottom sheet para que un Especialista apele la curaduría de un avistamiento
 * o contribución, marcándolo como "En revisión".
 *
 * Endpoints:
 *  PATCH /api/v1/contributions/:id/appeal  { notes? }
 *  PATCH /api/v1/sightings/:id/appeal      { notes? }
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../utils/authStore';

const { height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihcobservatorio2-202625.onrender.com';

const C = {
  white: '#FFFFFF',
  earth: '#4A3F35',
  sage: '#9EB36D',
  gray: '#A09D9A',
  border: '#E8E8E8',
  amber: '#E65100',
  amberBg: '#FFF3E0',
  lightText: 'rgba(74,63,53,0.55)',
  scrim: 'rgba(0,0,0,0.4)',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  validated: 'Validado',
  in_review: 'En revisión',
  rejected: 'Rechazado',
};

export interface AppealTarget {
  id: string;
  /** Tabla de origen: determina el endpoint a usar */
  source: 'contribution' | 'sighting';
  photo_url?: string;
  preliminary_species?: string;
  observed_at?: string;
  status?: string;
}

interface AppealSheetProps {
  visible: boolean;
  item: AppealTarget | null;
  onClose: () => void;
  /** Se invoca tras una apelación exitosa con el id del registro */
  onSuccess: (id: string) => void;
}

export default function AppealSheet({ visible, item, onClose, onSuccess }: AppealSheetProps) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      setNotes('');
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(height);
    }
  }, [visible]);

  const handleDismiss = () => {
    if (submitting) return;
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 200,
      useNativeDriver: true,
    }).start(onClose);
  };

  const submitAppeal = async () => {
    if (!item) return;
    setSubmitting(true);
    try {
      const { token } = await authStore.getSession();
      const endpointBase = item.source === 'contribution' ? 'contributions' : 'sightings';

      const res = await fetch(`${API_URL}/api/v1/${endpointBase}/${item.id}/appeal`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes.trim() || undefined }),
      });

      if (res.ok) {
        Alert.alert('Apelación registrada', 'El registro pasó a estado "En revisión".');
        onSuccess(item.id);
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 200,
          useNativeDriver: true,
        }).start(onClose);
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', (err as any).detail ?? 'No se pudo registrar la apelación.');
      }
    } catch {
      Alert.alert('Error de red', 'Verifica tu conexión e intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const CONFIRM_MESSAGE = '¿Estás seguro que deseas marcar este registro como "En revisión"? Se notificará al validador y al autor.';

  const handleConfirm = () => {
    // Alert.alert con múltiples botones es un no-op en react-native-web:
    // en esa plataforma no hay forma de que el usuario confirme, así que
    // usamos window.confirm como equivalente bloqueante.
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(CONFIRM_MESSAGE)) {
        submitAppeal();
      }
      return;
    }
    Alert.alert('Confirmar apelación', CONFIRM_MESSAGE, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apelar', style: 'destructive', onPress: submitAppeal },
    ]);
  };

  if (!item) return null;

  const dateStr = item.observed_at
    ? new Date(item.observed_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Ionicons name="warning-outline" size={20} color={C.amber} />
            <Text style={styles.title}>Apelar Curaduría</Text>
            <TouchableOpacity onPress={handleDismiss} hitSlop={10} disabled={submitting}>
              <Ionicons name="close" size={22} color={C.gray} />
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Al apelar, este registro volverá a estado &quot;En revisión&quot;. Se notificará al validador y al autor.
          </Text>

          <View style={styles.card}>
            {item.photo_url ? (
              <Image source={{ uri: item.photo_url }} style={styles.thumb} resizeMode="cover" />
            ) : (
              <View style={[styles.thumb, styles.thumbFallback]}>
                <Ionicons name="image-outline" size={22} color={C.gray} />
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.cardSpecies} numberOfLines={1}>
                {item.preliminary_species ?? 'Especie sin identificar'}
              </Text>
              {!!dateStr && <Text style={styles.cardMeta}>{dateStr}</Text>}
              {!!item.status && (
                <Text style={styles.cardStatus}>{STATUS_LABEL[item.status] ?? item.status}</Text>
              )}
            </View>
          </View>

          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe las razones técnicas de tu apelación (opcional)..."
            placeholderTextColor={C.lightText}
            multiline
            maxLength={500}
            editable={!submitting}
          />
          <Text style={styles.charCount}>{notes.length}/500</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleDismiss}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, submitting && { opacity: 0.6 }]}
              onPress={handleConfirm}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Ionicons name="flag-outline" size={18} color={C.white} />
                  <Text style={styles.confirmBtnText}>Confirmar Apelación</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.scrim,
  },
  sheet: {
    marginTop: 'auto',
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: C.earth,
  },
  description: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.lightText,
    lineHeight: 18,
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F6F6F6',
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: C.border,
  },
  thumbFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1, gap: 2 },
  cardSpecies: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.earth,
  },
  cardMeta: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.lightText,
  },
  cardStatus: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: C.amber,
  },
  notesInput: {
    backgroundColor: '#F6F6F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.earth,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: C.gray,
    textAlign: 'right',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: '#F0F0F0',
  },
  cancelBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: C.earth,
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: C.amber,
  },
  confirmBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: C.white,
  },
});
