import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../utils/authStore';
import { ComunidadSkeleton, DOME_CARD_WIDTH, DOME_CARD_HEIGHT } from './Skeleton';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihc-2-0.onrender.com';

const C = {
  bg: '#F6F6F6',
  forest: '#1E2A21',
  earth: '#4A3F35',
  sage: '#9EB36D',
  white: '#FFFFFF',
  gray: '#A09D9A',
  border: '#E0E0E0',
  yellowBg: '#FFF9E6',
  yellow: '#F0C300',
  greenBg: '#E8F5E9',
  green: '#4CAF50',
  redBg: '#FFEBEE',
  red: '#EF5350',
};

type FilterType = 'Todas' | 'Validadas' | 'No validadas' | 'En proceso' | 'En proyectos';

interface Sighting {
  id: string;
  photo_url: string;
  preliminary_species?: string;
  observed_at: string;
  status: 'pending' | 'validated' | 'rejected' | 'in_review';
  decimal_latitude?: number;
  decimal_longitude?: number;
  metadata_edited?: boolean;
  profiles?: { username: string; avatar_url?: string };
  species?: { scientific_name: string; common_name?: string };
  user_id: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'En espera',  color: C.yellow, bg: C.yellowBg },
  validated: { label: 'Validado',   color: C.green,  bg: C.greenBg },
  rejected:  { label: 'Rechazado',  color: C.red,    bg: C.redBg },
  in_review: { label: 'En revisión',color: C.earth,  bg: '#FFF3E0' },
};

const FILTER_STATUS: Record<FilterType, string | null> = {
  'Todas': null,
  'Validadas': 'validated',
  'No validadas': 'rejected',
  'En proceso': 'in_review',
  'En proyectos': null, // extensión futura
};

interface ComunidadTabProps {
  onSightingPress?: (sighting: Sighting) => void;
  /** true cuando el usuario navega sin sesión */
  isGuest?: boolean;
  /** rol del usuario: 'entusiasta' | 'especialista' | 'invitado' */
  userRole?: string;
}

export default function ComunidadTab({ onSightingPress, isGuest = false, userRole = 'invitado' }: ComunidadTabProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<FilterType[]>(['Todas']);
  const [appliedFilters, setAppliedFilters] = useState<FilterType[]>(['Todas']);

  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const fetchSightings = useCallback(async () => {
    try {
      const { token, user } = await authStore.getSession();
      if (user?.id) setMyUserId(user.id);

      const res = await fetch(`${API_URL}/api/v1/sightings/feed`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      
      setSightings(data.sightings || []);
    } catch (e) {
      // Fallo silencioso — el estado vacío lo maneja el ListEmptyComponent
      console.warn('Error fetching community sightings:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSightings(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchSightings(); };

  const toggleFilter = (filter: FilterType) => {
    if (filter === 'Todas') { setTempFilters(['Todas']); return; }
    let next = tempFilters.filter((f) => f !== 'Todas');
    if (next.includes(filter)) {
      next = next.filter((f) => f !== filter);
      if (next.length === 0) next = ['Todas'];
    } else {
      next.push(filter);
    }
    setTempFilters(next);
  };

  const handleApply = () => { setAppliedFilters(tempFilters); setIsDropdownOpen(false); };

  const getDropdownLabel = () => {
    if (appliedFilters.includes('Todas')) return 'Todas';
    return appliedFilters.join(', ');
  };

  const handleHide = (id: string) => {
    setHiddenIds((prev) => new Set([...prev, id]));
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Eliminar avistamiento', '¿Seguro que deseas eliminar este avistamiento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const { token } = await authStore.getSession();
            await fetch(`${API_URL}/api/v1/sightings/${id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            setSightings((prev) => prev.filter((s) => s.id !== id));
          } catch {
            Alert.alert('Error', 'No se pudo eliminar. Intenta nuevamente.');
          }
        },
      },
    ]);
  };

  const isEspecialista = userRole === 'especialista';

  /** Muestra alert de login cuando un invitado intenta una acción interactiva */
  const requireLogin = (action: () => void) => {
    if (isGuest) {
      Alert.alert(
        'Inicia sesión',
        'Necesitas una cuenta para interactuar con la comunidad.',
        [{ text: 'OK' }],
      );
      return;
    }
    action();
  };

  /** Apelar una curaduría (solo Especialistas) */
  const handleAppeal = async (item: Sighting) => {
    try {
      const { token } = await authStore.getSession();
      if (!token) return;
      await fetch(`${API_URL}/api/v1/sightings/${item.id}/appeal`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      // Actualiza el estado local optimistamente
      setSightings((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, status: 'in_review' } : s)),
      );
    } catch {
      Alert.alert('Error', 'No se pudo apelar la curaduría.');
    }
  };

  // Aplicar filtros
  const filteredSightings = sightings.filter((s) => {
    if (hiddenIds.has(s.id)) return false;
    if (appliedFilters.includes('Todas')) return true;
    return appliedFilters.some((f) => {
      const targetStatus = FILTER_STATUS[f];
      return targetStatus ? s.status === targetStatus : true;
    });
  });

  const renderSightingCard = ({ item }: { item: Sighting }) => {
    const status = STATUS_MAP[item.status] ?? STATUS_MAP.pending;
    const isOwn = item.user_id === myUserId;
    const dateStr = new Date(item.observed_at).toLocaleDateString('es-VE', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    const domeRadius = DOME_CARD_WIDTH / 2;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onSightingPress?.(item)}
        style={[
          styles.card,
          {
            width: DOME_CARD_WIDTH,
            height: DOME_CARD_HEIGHT,
            borderTopLeftRadius: domeRadius,
            borderTopRightRadius: domeRadius,
          },
        ]}
      >
        {item.photo_url ? (
          <Image
            source={{ uri: item.photo_url }}
            style={[
              styles.cardImage,
              { borderTopLeftRadius: domeRadius, borderTopRightRadius: domeRadius },
            ]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.cardImage,
              { borderTopLeftRadius: domeRadius, borderTopRightRadius: domeRadius },
            ]}
          />
        )}

        {/* Floating badge for Edited Metadata */}
        {item.metadata_edited && (
          <View style={styles.editedBadgeFloating}>
            <Text style={styles.editedBadgeTextFloating}>Editado</Text>
          </View>
        )}

        {/* Floating actions for own sighting */}
        {isOwn && !isGuest && (
          <View style={styles.cardActionsFloating} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.actionBtnFloating}
              activeOpacity={0.7}
              onPress={() => handleHide(item.id)}
            >
              <Ionicons name="eye-off-outline" size={14} color={C.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtnFloating, styles.actionBtnDangerFloating]}
              activeOpacity={0.7}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={14} color={C.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Botón Apelar (solo Especialistas en avistamientos validados ajenos) */}
        {isEspecialista && !isOwn && item.status === 'validated' && (
          <TouchableOpacity
            style={styles.appealBtn}
            activeOpacity={0.8}
            onPress={() => handleAppeal(item)}
          >
            <Ionicons name="flag-outline" size={12} color={C.white} />
          </TouchableOpacity>
        )}

        {/* Text overlay for contrast and readability */}
        <View style={styles.textContainer}>
          <Text style={styles.cardSpecies} numberOfLines={1}>
            {item.species?.common_name
              || item.species?.scientific_name
              || item.preliminary_species
              || 'Especie desconocida'}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {dateStr}{item.profiles?.username ? ` · @${item.profiles.username}` : ''}
          </Text>
        </View>

        {/* Status dot in the middle bottom border */}
        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Título y Filtros */}
      <View style={styles.topSection}>
        <Text style={styles.headerTitle}>Comunidad</Text>

        <View style={styles.dropdownWrapper}>
          <TouchableOpacity
            style={styles.dropdownPill}
            activeOpacity={0.8}
            onPress={() => {
              if (!isDropdownOpen) setTempFilters(appliedFilters);
              setIsDropdownOpen(!isDropdownOpen);
            }}
          >
            <Text style={styles.dropdownText} numberOfLines={1}>{getDropdownLabel()}</Text>
            <Ionicons name={isDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.forest} />
          </TouchableOpacity>

          {isDropdownOpen && (
            <View style={styles.dropdownPanel}>
              <View style={{ height: 5 }} />
              {(['Todas', 'Validadas', 'No validadas', 'En proceso', 'En proyectos'] as FilterType[]).map((filter) => {
                const isSelected = tempFilters.includes(filter);
                return (
                  <TouchableOpacity
                    key={filter}
                    style={styles.dropdownOption}
                    activeOpacity={0.7}
                    onPress={() => toggleFilter(filter)}
                  >
                    <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}>
                      {filter}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color={C.sage} />}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.applyBtn} activeOpacity={0.85} onPress={handleApply}>
                <Text style={styles.applyBtnText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Lista */}
      {loading ? (
        <ComunidadSkeleton />
      ) : (
        <FlatList
          data={filteredSightings}
          keyExtractor={(item) => item.id}
          renderItem={renderSightingCard}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.sage} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aún no hay avistamientos</Text>
              <TouchableOpacity style={styles.registerBtn} activeOpacity={0.85}>
                <Ionicons name="add-circle-outline" size={18} color={C.white} style={{ marginRight: 8 }} />
                <Text style={styles.registerBtnText}>Registrar avistamiento</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
    zIndex: 100,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    color: C.forest,
    marginBottom: 20,
  },

  // ── Dropdown ─────────────────────────────────────────────
  dropdownWrapper: { width: '100%', position: 'relative', zIndex: 100 },
  dropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  dropdownText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: C.forest,
    flex: 1,
    marginRight: 10,
  },
  dropdownPanel: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: C.white,
    borderRadius: 18,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
    zIndex: 150,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  dropdownOptionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: C.earth,
  },
  dropdownOptionTextActive: {
    fontFamily: 'Poppins_600SemiBold',
    color: C.forest,
  },
  applyBtn: {
    backgroundColor: C.forest,
    borderRadius: 20,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.white,
  },

  // ── Lista ──────────────────────────────────────────────
  // ── Lista ──────────────────────────────────────────────
  listContent: { paddingHorizontal: 16, paddingBottom: 140, gap: 12 },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 120,
  },

  // ── Tarjeta de avistamiento ────────────────────────────
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 8,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: C.border,
  },
  textContainer: {
    position: 'absolute',
    bottom: 18,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    gap: 2,
    zIndex: 5,
  },
  cardSpecies: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: C.white,
    textAlign: 'center',
  },
  cardMeta: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 9,
    color: '#E0E0E0',
    textAlign: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: -12,
    alignSelf: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#F6F6F6',
    zIndex: 10,
  },
  cardActionsFloating: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
    zIndex: 15,
  },
  actionBtnFloating: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDangerFloating: {
    backgroundColor: 'rgba(239, 83, 80, 0.95)',
  },
  editedBadgeFloating: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 235, 238, 0.95)',
    borderColor: '#EF5350',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    zIndex: 15,
  },
  appealBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(74,63,53,0.75)',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  editedBadgeTextFloating: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 8,
    color: '#EF5350',
  },

  // ── Estado vacío ────────────────────────────────────────
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 100,
    gap: 20,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: C.gray,
    fontStyle: 'italic',
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.sage,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  registerBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.white,
  },
});
