import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ScrollView,
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
  cover_url?: string;       // si el backend expone una imagen del proyecto
  start_date: string;
  end_date?: string;
  contributors?: Contributor[];
  subscriber_count?: number;
}

export default function DocumentosTab() {
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const fetchProjects = useCallback(async () => {
    try {
      const { token } = await authStore.getSession();
      const res = await fetch(`${API_URL}/api/v1/investigations/active`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      // La API puede devolver array directo o { investigations: [] }
      const list: Investigation[] = Array.isArray(data) ? data : (data.investigations ?? []);
      setProjects(list);
    } catch {
      // fallo silencioso — el estado vacío lo maneja la UI
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchProjects(); };

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

    // Contribuyentes simulados mientras el backend no los expone directamente
    const contributors: Contributor[] = item.contributors ?? [];

    return (
      <Animated.View
        key={item.id}
        style={[styles.card, { transform: [{ scale }] }]}
      >
        {/* Imagen de fondo */}
        {item.cover_url ? (
          <Image source={{ uri: item.cover_url }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="leaf-outline" size={48} color={C.sage} />
          </View>
        )}

        {/* Gradiente inferior oscuro para legibilidad */}
        <View style={styles.cardOverlay} />

        {/* Contenido superpuesto en la tarjeta */}
        <View style={styles.cardContent}>
          {/* Estado del proyecto */}
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, item.status === 'active' ? styles.dotActive : styles.dotInactive]} />
            <Text style={styles.statusText}>
              {item.status === 'active' ? 'Activo' : item.status === 'archived' ? 'Archivado' : 'Inactivo'}
            </Text>
          </View>

          {/* Nombre del proyecto */}
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

          {/* Avatares de contribuyentes */}
          {contributors.length > 0 && (
            <View style={styles.contributorsRow}>
              {contributors.slice(0, 4).map((c, i) => (
                <View key={i} style={[styles.contributorAvatar, { marginLeft: i > 0 ? -10 : 0 }]}>
                  {c.avatar_url ? (
                    <Image source={{ uri: c.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarInitial}>
                        {c.username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              {contributors.length > 4 && (
                <View style={[styles.contributorAvatar, styles.avatarMore, { marginLeft: -10 }]}>
                  <Text style={styles.avatarMoreText}>+{contributors.length - 4}</Text>
                </View>
              )}
              <Text style={styles.contributorsLabel}>
                {contributors.length === 1 ? '1 contribuyente' : `${contributors.length} contribuyentes`}
              </Text>
            </View>
          )}
        </View>

        {/* Botón Explorar centrado */}
        <TouchableOpacity style={styles.exploreBtn} activeOpacity={0.85}>
          <Text style={styles.exploreBtnText}>Explorar</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ── Indicadores de paginación ──────────────────────────────
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
        // Estado vacío
        <View style={styles.centered} />
      ) : (
        <>
          {/* Carrusel con scroll horizontal nativo */}
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

          {/* Dots de paginación */}
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

  // ── Título ──────────────────────────────────────────────
  titleRow: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
    alignItems: 'center',
  },
  screenTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    color: C.forest,
  },

  // ── Centrado genérico ────────────────────────────────────
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },

  // ── Carrusel ────────────────────────────────────────────
  carouselContent: {
    paddingHorizontal: (width - CARD_WIDTH) / 2 - CARD_MARGIN,
    paddingVertical: 10,
    alignItems: 'center',
  },

  // ── Tarjeta ─────────────────────────────────────────────
  card: {
    width: CARD_WIDTH,
    height: width * 1.1,       // Proporción vertical dominante, como en el mockup
    borderRadius: 28,
    marginHorizontal: CARD_MARGIN,
    overflow: 'hidden',
    backgroundColor: C.forest,
    // Sombra
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    backgroundColor: '#E8F3EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    background: undefined,
    backgroundColor: 'transparent',
    // Gradiente simulado con capas — parte inferior oscura
    borderRadius: 28,
    // En RN no hay LinearGradient nativo sin librería; usamos un View con gradiente táctil:
  },

  // ── Contenido sobre la imagen ────────────────────────────
  cardContent: {
    position: 'absolute',
    bottom: 80,               // Arriba del botón Explorar
    left: 20,
    right: 20,
    gap: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
    marginBottom: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotActive: { backgroundColor: C.sage },
  dotInactive: { backgroundColor: '#A09D9A' },
  statusText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: C.white,
  },
  cardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    color: C.white,
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ── Contribuyentes ───────────────────────────────────────
  contributorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  contributorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.white,
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: {
    flex: 1,
    backgroundColor: C.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: C.white,
  },
  avatarMore: {
    backgroundColor: C.earth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMoreText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: C.white,
  },
  contributorsLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginLeft: 10,
  },

  // ── Botón Explorar ───────────────────────────────────────
  exploreBtn: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: C.earth,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    // Sombra táctil
    shadowColor: C.earth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  exploreBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    color: C.white,
    letterSpacing: 0.3,
  },

  // ── Dots de paginación ───────────────────────────────────
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: C.earth,
  },
});
