import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authStore } from '../utils/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihcobservatorio2-202625.onrender.com';

const C = {
  bg: '#F6F6F6',
  forest: '#1E2A21',
  earth: '#4A3F35',
  sage: '#9EB36D',
  white: '#FFFFFF',
  gray: '#A09D9A',
  border: '#E8E8E8',
};

export interface Investigation {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  survey_questions?: any[];
  cover_url?: string;
  status: string;
  methods?: string;
}

interface ProjectListScreenProps {
  onBack: () => void;
  onViewDetail: (project: Investigation) => void;
  subscribedIds: Set<string>;
  onSubscribedChange: (id: string, joined: boolean) => void;
}

export default function ProjectListScreen({
  onBack,
  onViewDetail,
  subscribedIds,
  onSubscribedChange,
}: ProjectListScreenProps) {
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const { token } = await authStore.getSession();
      const res = await fetch(`${API_URL}/investigations/active`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : (data.investigations ?? []));
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  React.useEffect(() => { fetchProjects(); }, []);

  const handleJoin = async (id: string) => {
    setJoiningId(id);
    try {
      const { token } = await authStore.getSession();
      const res = await fetch(`${API_URL}/investigations/${id}/subscribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        onSubscribedChange(id, true);
        Alert.alert('¡Unido!', 'Te has unido al proyecto exitosamente.');
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', err.message ?? 'No se pudo unir al proyecto.');
      }
    } catch {
      Alert.alert('Error', 'Verifica tu conexión e intenta de nuevo.');
    } finally {
      setJoiningId(null);
    }
  };

  const renderItem = ({ item }: { item: Investigation }) => {
    const isSubscribed = subscribedIds.has(item.id);
    const daysActive = Math.floor(
      (Date.now() - new Date(item.start_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.75}
        onPress={() => onViewDetail(item)}
      >
        {/* Miniatura del proyecto */}
        <View style={styles.thumbWrap}>
          {item.cover_url ? (
            <Image source={{ uri: item.cover_url }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Ionicons name="leaf-outline" size={22} color={C.sage} />
            </View>
          )}
        </View>

        {/* Nombre y días */}
        <View style={styles.rowMeta}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.rowSub}>{daysActive} días activo</Text>
        </View>

        {/* Botón Unirme / ya unido */}
        {isSubscribed ? (
          <View style={styles.joinedBadge}>
            <Ionicons name="checkmark" size={14} color={C.sage} />
            <Text style={styles.joinedText}>Unido</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.joinBtn}
            activeOpacity={0.8}
            onPress={() => handleJoin(item.id)}
            disabled={joiningId === item.id}
          >
            {joiningId === item.id ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <Text style={styles.joinBtnText}>Unirme</Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.earth} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Catálogo de Proyectos</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.sage} />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchProjects(); }}
              tintColor={C.sage}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No hay proyectos activos</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const THUMB = 60;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

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
    fontSize: 20,
    color: C.forest,
    flex: 1,
  },

  // ── Lista ────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },
  separator: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 4,
  },

  // ── Fila de proyecto ────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    backgroundColor: C.bg,
  },
  thumbWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    overflow: 'hidden',
    backgroundColor: C.border,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    backgroundColor: '#E8F3EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMeta: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: C.forest,
  },
  rowSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.gray,
  },

  // ── Botón Unirme ─────────────────────────────────────────
  joinBtn: {
    backgroundColor: C.sage,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
    minWidth: 80,
    alignItems: 'center',
  },
  joinBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: C.white,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(158,179,109,0.15)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  joinedText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: C.sage,
  },

  // ── Estados ──────────────────────────────────────────────
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: C.gray,
    fontStyle: 'italic',
  },
});
