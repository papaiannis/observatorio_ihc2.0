import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authStore } from '../utils/authStore';
import { ProyectosCarouselSkeleton } from './Skeleton';

const { width } = Dimensions.get('window');

// Cada tarjeta ocupa el 80% del ancho, y se ven las tarjetas adyacentes
const CARD_WIDTH = width * 0.78;
const CARD_MARGIN = 12;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN * 2;

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihc-2-0.onrender.com';

const C = {
  bg: '#F6F6F6',
  forest: '#1E2A21',
  earth: '#4A3F35',
  sage: '#9EB36D',
  white: '#FFFFFF',
  gray: '#A09D9A',
  overlay: 'rgba(0,0,0,0.35)',
  cream: '#FFEDDA',
};

interface Contributor {
  username: string;
  avatar_url?: string;
}

interface Investigation {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'inactive' | 'archived';
  cover_url?: string;
  start_date: string;
  end_date?: string;
  contributors?: Contributor[];
  subscriber_count?: number;
}

export default function DocumentosTab({
  onProjectPress,
  isGuest = false,
}: {
  onProjectPress?: (project: Investigation) => void;
  isGuest?: boolean;
}) {
  const [projects, setProjects] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedProjects, setLikedProjects] = useState<Record<string, boolean>>({});
  const scrollX = useRef(new Animated.Value(0)).current;

  /** Guard: muestra alert de login para invitados */
  const handleProjectPress = (project: Investigation) => {
    if (isGuest) {
      Alert.alert(
        'Inicia sesión',
        'Crea una cuenta gratuita para unirte a investigaciones científicas.',
        [{ text: 'OK' }],
      );
      return;
    }
    onProjectPress?.(project);
  };

  const fetchProjects = useCallback(async () => {
    try {
      const { token } = await authStore.getSession();
      const res = await fetch(`${API_URL}/api/v1/investigations/active`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const list: Investigation[] = Array.isArray(data) ? data : (data.investigations ?? []);
      setProjects(list);
    } catch (err) {
      console.warn('Error fetching active projects:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects();
  };

  const toggleLike = (projectId: string) => {
    setLikedProjects((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  // ── Renderizado de cada tarjeta de proyecto ────────────────
  const renderCard = (item: Investigation, index: number) => {
    // Animación de escala: la tarjeta central está al 100%, las laterales al 92%
    const inputRange = [
      (index - 1) * SNAP_INTERVAL,
      index * SNAP_INTERVAL,
      (index + 1) * SNAP_INTERVAL,
    ];
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.92, 1, 0.92],
      extrapolate: 'clamp',
    });

    const isLiked = !!likedProjects[item.id];
    const category = item.methods ? item.methods.split(' ')[0] : 'Ciencia';

    const daysLeft = item.end_date
      ? Math.max(0, Math.floor((new Date(item.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.95}
        onPress={() => handleProjectPress(item)}
      >
        <Animated.View
          style={[styles.card, { transform: [{ scale }] }]}
        >
          {/* Imagen de fondo del proyecto */}
          {item.cover_url ? (
            <Image source={{ uri: item.cover_url }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
              <Ionicons name="leaf" size={64} color="rgba(158,179,109,0.3)" />
            </View>
          )}

          {/* Gradiente inferior oscuro */}
          <View style={styles.cardOverlay} />

          {/* Botón de Like superior derecho (translúcido) */}
          <TouchableOpacity
            style={styles.topLikeBtn}
            onPress={() => toggleLike(item.id)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={20}
              color={isLiked ? "#E57373" : C.white}
            />
          </TouchableOpacity>

          {/* Contenido de la Tarjeta alineado a la izquierda */}
          <View style={styles.cardContent}>
            {/* Categoría / País (Indonesia en mockup) */}
            <Text style={styles.cardCategory}>{category}</Text>

            {/* Título (Bali en mockup) */}
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

            {/* Fila con días restantes y estado */}
            <View style={styles.ratingRow}>
              <View style={styles.ratingBadge}>
                <Ionicons name="time-outline" size={12} color={C.white} />
                <Text style={styles.ratingText}>-{daysLeft} dias</Text>
              </View>
              <Text style={styles.reviewsText}>
                {item.status === 'active' ? '● Activo' : '○ Inactivo'}
              </Text>
            </View>
          </View>

          {/* Cápsula inferior de "Explorar" (See More en mockup) */}
          <View style={styles.exploreCapsule}>
            <Text style={styles.exploreCapsuleText}>Explorar</Text>
            <View style={styles.arrowCircle}>
              <Ionicons name="chevron-forward" size={18} color={C.earth} />
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderDots = () => (
    <View style={styles.dotsRow}>
      {projects.map((_, i) => {
        const opacity = scrollX.interpolate({
          inputRange: [(i - 1) * SNAP_INTERVAL, i * SNAP_INTERVAL, (i + 1) * SNAP_INTERVAL],
          outputRange: [0.35, 1, 0.35],
          extrapolate: 'clamp',
        });
        const dotWidth = scrollX.interpolate({
          inputRange: [(i - 1) * SNAP_INTERVAL, i * SNAP_INTERVAL, (i + 1) * SNAP_INTERVAL],
          outputRange: [8, 22, 8],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View key={i} style={[styles.dot, { opacity, width: dotWidth }]} />
        );
      })}
    </View>
  );

  return (
    <View style={styles.root}>
      {/* ── Título ── */}
      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>Proyectos</Text>
      </View>

      {/* ── Contenido ── */}
      {loading ? (
        <ProyectosCarouselSkeleton />
      ) : projects.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="folder-open-outline" size={48} color={C.gray} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>No hay proyectos activos en este momento</Text>
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SNAP_INTERVAL}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContent}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
              setActiveIndex(idx);
            }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.sage} />
            }
          >
            {projects.map((item, index) => renderCard(item, index))}
          </ScrollView>

          {projects.length > 1 && renderDots()}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Título
  titleRow: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
    alignItems: 'center',
  },
  screenTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    color: C.forest,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.gray,
    textAlign: 'center',
  },

  // Carrusel
  carouselContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2 - CARD_MARGIN,
    paddingVertical: 10,
    alignItems: 'center',
  },

  // Tarjeta (Estilo Mockup)
  card: {
    width: CARD_WIDTH,
    height: width * 1.05,
    borderRadius: 32,
    marginHorizontal: CARD_MARGIN,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    elevation: 8,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E8F3EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)', // Degradado uniforme para legibilidad del texto
  },

  // Botón Like superior derecho (translúcido)
  topLikeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Contenido de la Tarjeta
  cardContent: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    gap: 4,
    zIndex: 5,
  },
  cardCategory: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    textTransform: 'capitalize',
  },
  cardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    color: C.white,
    lineHeight: 25,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Rating e indicadores
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  ratingText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: C.white,
  },
  reviewsText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Cápsula de Explorar (See More en mockup)
  exploreCapsule: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    right: 18,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 5,
    zIndex: 5,
  },
  exploreCapsuleText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.white,
  },
  arrowCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: C.earth,
  },
});
