import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../utils/authStore';

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

export default function ObservatorioTab() {
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

    return (
      <View style={styles.card}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImage} />
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardSpecies} numberOfLines={1}>
            {speciesObj?.common_name || speciesObj?.scientific_name || item.preliminary_species || 'Especie'}
          </Text>
          <Text style={styles.cardMeta}>
            {dateStr} {username ? ` · @${username}` : ''}
          </Text>
          {item.decimal_latitude && item.decimal_longitude && (
            <Text style={styles.cardCoords}>
              {item.decimal_latitude.toFixed(4)}, {item.decimal_longitude.toFixed(4)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Text style={styles.headerTitle}>Observatorio</Text>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={C.sage} />
        </View>
      ) : (
        <FlatList
          data={sightings}
          keyExtractor={(item) => item.id}
          renderItem={renderSightingCard}
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
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: C.border,
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  cardSpecies: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: C.forest,
  },
  cardMeta: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.gray,
  },
  cardCoords: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    color: C.sage,
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
