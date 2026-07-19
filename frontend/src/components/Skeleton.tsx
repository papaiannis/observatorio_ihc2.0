import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, ViewStyle } from 'react-native';

const { width } = Dimensions.get('window');

// Matemáticamente perfecto para Observatorio/Comunidad:
const CONTAINER_PADDING = 16;
const GAP = 12;
export const DOME_CARD_WIDTH = (width - CONTAINER_PADDING * 2 - GAP) / 2;
export const DOME_CARD_HEIGHT = DOME_CARD_WIDTH * 1.25; // Proporción vertical del mockup

// Proporciones del carrusel de proyectos (de DocumentosTab)
const PROJ_CARD_WIDTH = width * 0.78;
const PROJ_CARD_HEIGHT = width * 1.1;

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width: w, height: h, borderRadius, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width: (w ?? '100%') as any,
          height: (h ?? 20) as any,
          borderRadius: borderRadius ?? 8,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ── TARJETA DOMO INDIVIDUAL (OBSERVATORIO / COMUNIDAD) ──────────
export function DomeCardSkeleton() {
  const domeRadius = DOME_CARD_WIDTH / 2;

  return (
    <View style={styles.card}>
      {/* Sólido del domo */}
      <Skeleton
        width="100%"
        height="100%"
        borderRadius={20}
        style={{
          borderTopLeftRadius: domeRadius,
          borderTopRightRadius: domeRadius,
        }}
      />
      {/* Círculo de estado en el borde inferior central */}
      <View style={styles.statusDotOuter}>
        <Skeleton width={18} height={18} borderRadius={9} />
      </View>
    </View>
  );
}

// ── 1. SKELETON PARA OBSERVATORIO TAB ───────────────────────────
export function ObservatorioSkeleton() {
  return (
    <View style={styles.gridContainer}>
      {[1, 2, 3, 4].map((key) => (
        <DomeCardSkeleton key={key} />
      ))}
    </View>
  );
}

// ── 2. SKELETON PARA COMUNIDAD TAB ────────────────────────────────
export function ComunidadSkeleton() {
  return (
    <View style={styles.gridContainer}>
      {[1, 2, 3, 4].map((key) => (
        <DomeCardSkeleton key={key} />
      ))}
    </View>
  );
}

// ── 3. SKELETON PARA PROYECTOS EN CARRUSEL (DOCUMENTOS TAB) ───
export function ProyectosCarouselSkeleton() {
  return (
    <View style={styles.carouselWrapper}>
      <View style={styles.carouselContainer}>
        {[1, 2].map((key) => (
          <View key={key} style={styles.carouselCard}>
            <Skeleton width="100%" height="100%" borderRadius={28} />
            <View style={styles.carouselCardContent}>
              <Skeleton width="35%" height={20} borderRadius={10} style={{ marginBottom: 12 }} />
              <Skeleton width="80%" height={26} style={{ marginBottom: 12 }} />
              <Skeleton width="50%" height={14} />
            </View>
            <View style={styles.carouselBtnPlaceholder}>
              <Skeleton width="100%" height={48} borderRadius={24} />
            </View>
          </View>
        ))}
      </View>
      <View style={styles.dotsRow}>
        <Skeleton width={22} height={8} borderRadius={4} />
        <Skeleton width={8} height={8} borderRadius={4} />
        <Skeleton width={8} height={8} borderRadius={4} />
      </View>
    </View>
  );
}

// ── 4. SKELETON PARA LISTA DE PROYECTOS (CATÁLOGO) ────────────
export function ProjectListSkeleton() {
  return (
    <View style={styles.projectListContainer}>
      {[1, 2, 3, 4, 5].map((key) => (
        <View key={key} style={styles.row}>
          <Skeleton width={60} height={60} borderRadius={30} />
          <View style={styles.rowMeta}>
            <Skeleton width="70%" height={15} style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height={11} />
          </View>
          <Skeleton width={80} height={32} borderRadius={20} />
        </View>
      ))}
    </View>
  );
}

// ── 5. SKELETON PARA DETALLE DE PROYECTO ──────────────────────
export function ProjectDetailSkeleton() {
  return (
    <View style={styles.detailContainer}>
      {/* Cover Image Placeholder */}
      <Skeleton width="100%" height={200} borderRadius={0} style={{ marginBottom: 20 }} />

      <View style={styles.detailContent}>
        {/* Metric Cards Row */}
        <View style={styles.metricsRow}>
          {[1, 2, 3].map((key) => (
            <View key={key} style={styles.metricCard}>
              <Skeleton width={24} height={24} borderRadius={12} style={{ marginBottom: 6 }} />
              <Skeleton width="60%" height={14} style={{ marginBottom: 4 }} />
              <Skeleton width="40%" height={10} />
            </View>
          ))}
        </View>

        {/* Title and description */}
        <Skeleton width="80%" height={24} style={{ marginTop: 24, marginBottom: 12 }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="100%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="90%" height={14} style={{ marginBottom: 20 }} />

        {/* Survey Questions Area */}
        <Skeleton width="50%" height={18} style={{ marginBottom: 14, marginTop: 10 }} />
        {[1, 2].map((key) => (
          <View key={key} style={styles.surveyQuestionBlock}>
            <Skeleton width="70%" height={14} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={40} borderRadius={8} style={{ marginBottom: 12 }} />
          </View>
        ))}

        {/* Bottom Button */}
        <Skeleton width="100%" height={48} borderRadius={24} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: '#E5E7EB',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: CONTAINER_PADDING,
    paddingTop: 8,
    gap: GAP,
  },
  card: {
    width: DOME_CARD_WIDTH,
    height: DOME_CARD_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderTopLeftRadius: DOME_CARD_WIDTH / 2,
    borderTopRightRadius: DOME_CARD_WIDTH / 2,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 8,
  },
  statusDotOuter: {
    position: 'absolute',
    bottom: -12,
    alignSelf: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#F6F6F6',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  // Carrusel
  carouselWrapper: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
  },
  carouselContainer: {
    flexDirection: 'row',
    paddingHorizontal: (width - PROJ_CARD_WIDTH) / 2,
    gap: 24,
  },
  carouselCard: {
    width: PROJ_CARD_WIDTH,
    height: PROJ_CARD_HEIGHT,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    overflow: 'hidden',
  },
  carouselCardContent: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
  },
  carouselBtnPlaceholder: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },

  // Project List
  projectListContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  rowMeta: {
    flex: 1,
  },

  // Project Detail
  detailContainer: {
    flex: 1,
    backgroundColor: '#F6F6F6',
  },
  detailContent: {
    paddingHorizontal: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  surveyQuestionBlock: {
    marginBottom: 10,
  },
});
