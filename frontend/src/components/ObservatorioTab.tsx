import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../utils/authStore';
import { ObservatorioSkeleton, DOME_CARD_WIDTH, DOME_CARD_HEIGHT } from './Skeleton';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihcobservatorio2-202625.onrender.com';

const C = {
  bg: '#F6F6F6',
  forest: '#1E2A21',
  earth: '#4A3F35',
  sage: '#9EB36D',
  white: '#FFFFFF',
  gray: '#A09D9A',
  border: '#E0E0E0',
};

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

interface ObservatorioTabProps {
  onSightingPress?: (sighting: Sighting) => void;
}

export default function ObservatorioTab({ onSightingPress }: ObservatorioTabProps) {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchObservatory = useCallback(async () => {
    try {
      setLoading(true);
      const { token } = await authStore.getSession();
      
      const endpoint = `${API_URL}/api/v1/sightings/feed`;

      const res = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      
      // En el observatorio solo se muestran los avistamientos validados
      const allSightings: Sighting[] = data.sightings || [];
      const validatedSightings = allSightings.filter(s => s.status === 'validated');

      setSightings(validatedSightings);
    } catch (e) {
      // Manejado silenciosamente, se mostrará la lista vacía
      console.warn('Error fetching observatory:', e);
      setSightings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchObservatory(); }, [fetchObservatory]);

  const onRefresh = () => { setRefreshing(true); fetchObservatory(); };

  const renderSightingCard = ({ item }: { item: Sighting }) => {
    const dateStr = new Date(item.observed_at).toLocaleDateString('es-VE', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    const username = Array.isArray(item.profiles) ? item.profiles[0]?.username : item.profiles?.username;
    const speciesObj = Array.isArray(item.species) ? item.species[0] : item.species;
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

        {/* Text overlay for contrast and readability */}
        <View style={styles.textContainer}>
          <Text style={styles.cardSpecies} numberOfLines={1}>
            {speciesObj?.common_name || speciesObj?.scientific_name || item.preliminary_species || 'Especie'}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {dateStr}{username ? ` · @${username}` : ''}
          </Text>
          {item.decimal_latitude && item.decimal_longitude && (
            <Text style={styles.cardCoords} numberOfLines={1}>
              {item.decimal_latitude.toFixed(3)}, {item.decimal_longitude.toFixed(3)}
            </Text>
          )}
        </View>

        {/* Status dot in the middle bottom border */}
        <View style={styles.statusDot} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Text style={styles.headerTitle}>Observatorio</Text>
      </View>

      {loading ? (
        <ObservatorioSkeleton />
      ) : (
        <FlatList
          data={sightings}
          keyExtractor={(item) => item.id}
          renderItem={renderSightingCard}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.sage} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aún no hay avistamientos verificados</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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

  // ── Lista y Tarjetas ──────────────────────────────────
  listContent: { paddingHorizontal: 16, paddingBottom: 140, gap: 12 },
  columnWrapper: {
    justifyContent: 'space-between',
  },
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
  cardCoords: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 8,
    color: C.sage,
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
    backgroundColor: '#9EB36D',
    zIndex: 10,
  },

  // ── Estado vacío ─────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: C.gray,
    fontStyle: 'italic',
  },
});
