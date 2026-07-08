import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 5;
const CIRCLE_SIZE = 64; // Círculo un poco más grande para el efecto

const C = {
  sage: '#9EB36D', // Verde claro de la barra
  earth: '#4A3F35', // Marrón oscuro de los iconos
  bg: '#F6F6F6', // Fondo del observatorio para el efecto de recorte
};

export type TabType = 'observatorio' | 'documentos' | 'crear' | 'comunidad' | 'configuracion';

interface FooterProps {
  activeTab: TabType;
  onTabPress?: (tab: TabType) => void;
}

const TABS: { id: TabType; icon: string; library: 'ionicons' | 'material' }[] = [
  { id: 'observatorio', icon: 'dome-light', library: 'material' },
  { id: 'documentos', icon: 'folder-open-outline', library: 'ionicons' },
  { id: 'crear', icon: 'add', library: 'ionicons' },
  { id: 'comunidad', icon: 'people-outline', library: 'ionicons' },
  { id: 'configuracion', icon: 'settings-sharp', library: 'ionicons' },
];

export default function Footer({ activeTab, onTabPress }: FooterProps) {
  // Animación horizontal del círculo
  const circleX = useRef(new Animated.Value(0)).current;

  // Animaciones verticales independientes para levantar cada icono
  const iconY0 = useRef(new Animated.Value(0)).current;
  const iconY1 = useRef(new Animated.Value(0)).current;
  const iconY2 = useRef(new Animated.Value(0)).current;
  const iconY3 = useRef(new Animated.Value(0)).current;
  const iconY4 = useRef(new Animated.Value(0)).current;

  const iconAnimations = [iconY0, iconY1, iconY2, iconY3, iconY4];

  useEffect(() => {
    const activeIndex = TABS.findIndex((tab) => tab.id === activeTab);
    if (activeIndex === -1) return;

    // Calcular la posición central del círculo
    const targetCircleX = TAB_WIDTH * activeIndex + TAB_WIDTH / 2 - CIRCLE_SIZE / 2;

    const animations = [
      // Mueve el círculo horizontalmente
      Animated.spring(circleX, {
        toValue: targetCircleX,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
    ];

    // Levanta el icono activo y baja los demás
    TABS.forEach((_, index) => {
      const isCurrent = index === activeIndex;
      animations.push(
        Animated.spring(iconAnimations[index], {
          toValue: isCurrent ? -33 : 0, // Se levanta -33px para quedar en el centro del círculo (limite superior de la barra)
          useNativeDriver: true,
          tension: 60,
          friction: 7,
        })
      );
    });

    Animated.parallel(animations).start();
  }, [activeTab]);

  const handlePress = (tabId: TabType) => {
    if (tabId === activeTab) return;
    onTabPress?.(tabId);
  };

  return (
    <View style={styles.container}>
      {/* Barra de fondo Sage */}
      <View style={styles.tabBarBackground} />

      {/* Círculo con borde recortado que simula la muesca */}
      <Animated.View
        style={[
          styles.activeCircle,
          {
            transform: [{ translateX: circleX }],
          },
        ]}
      />

      {/* Capa superior interactiva para los botones */}
      <View style={styles.tabBarContent}>
        {TABS.map((tab, index) => {
          const iconSize = tab.id === 'crear' ? 32 : 26;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              activeOpacity={0.8}
              onPress={() => handlePress(tab.id)}
            >
              <Animated.View
                style={{
                  transform: [{ translateY: iconAnimations[index] }],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {tab.library === 'material' ? (
                  <MaterialCommunityIcons
                    name={tab.icon as any}
                    size={28}
                    color={C.earth}
                  />
                ) : (
                  <Ionicons
                    name={tab.icon as any}
                    size={iconSize}
                    color={C.earth}
                  />
                )}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: width,
    height: 100, // Aumentado para acomodar el círculo más alto sin recortar
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  // Barra inferior Sage Green
  tabBarBackground: {
    backgroundColor: C.sage,
    height: 65,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: width,
    position: 'absolute',
    bottom: 0,
    zIndex: 10,
  },
  // Contenedor de botones interactivos
  tabBarContent: {
    height: 65,
    flexDirection: 'row',
    alignItems: 'center',
    width: width,
    position: 'absolute',
    bottom: 0,
    zIndex: 20,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Círculo Sage Green con borde del color de fondo para simular el recorte
  activeCircle: {
    position: 'absolute',
    bottom: 33, // Posición ajustada para que el centro del círculo esté en el límite superior (65px - 32px = 33px)
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: C.sage, // Mismo color de la barra
    borderWidth: 6, // El grosor del recorte
    borderColor: C.bg, // Color de fondo del app (#F6F6F6) para simular el corte curvo
    zIndex: 15, // Por encima del fondo, por debajo de los iconos
  },
});
