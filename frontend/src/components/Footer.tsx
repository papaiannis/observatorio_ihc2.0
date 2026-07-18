import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = 64;

const C = {
  sage: '#9EB36D',
  earth: '#4A3F35',
  bg: '#F6F6F6',
};

export type TabType = 'observatorio' | 'documentos' | 'crear' | 'comunidad' | 'configuracion';

interface FooterProps {
  activeTab: TabType;
  onTabPress?: (tab: TabType) => void;
  /** true cuando el usuario no tiene sesión iniciada */
  isGuest?: boolean;
}

interface TabDef {
  id: TabType;
  icon: string;
  library: 'ionicons' | 'material';
  /** Si true, el tab está oculto para invitados */
  requiresAuth: boolean;
}

const ALL_TABS: TabDef[] = [
  { id: 'observatorio', icon: 'dome-light',        library: 'material',  requiresAuth: false },
  { id: 'documentos',   icon: 'folder-open-outline',library: 'ionicons',  requiresAuth: false },
  { id: 'crear',        icon: 'add',               library: 'ionicons',  requiresAuth: true  },
  { id: 'comunidad',    icon: 'people-outline',     library: 'ionicons',  requiresAuth: false },
  { id: 'configuracion',icon: 'settings-sharp',     library: 'ionicons',  requiresAuth: true  },
];

export default function Footer({ activeTab, onTabPress, isGuest = false }: FooterProps) {
  // Filtra tabs según si el usuario es invitado
  const TABS = useMemo(
    () => (isGuest ? ALL_TABS.filter((t) => !t.requiresAuth) : ALL_TABS),
    [isGuest],
  );

  const TAB_WIDTH = width / TABS.length;

  // Animación horizontal del círculo
  const circleX = useRef(new Animated.Value(0)).current;

  // Animaciones verticales para cada tab (máximo 5)
  const iconAnims = useRef(ALL_TABS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const activeIndex = TABS.findIndex((tab) => tab.id === activeTab);
    if (activeIndex === -1) return;

    const targetCircleX = TAB_WIDTH * activeIndex + TAB_WIDTH / 2 - CIRCLE_SIZE / 2;

    const animations: Animated.CompositeAnimation[] = [
      Animated.spring(circleX, {
        toValue: targetCircleX,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
    ];

    // Levanta el icono activo y baja los demás
    TABS.forEach((tab, index) => {
      const globalIndex = ALL_TABS.findIndex((t) => t.id === tab.id);
      const isCurrent = index === activeIndex;
      animations.push(
        Animated.spring(iconAnims[globalIndex], {
          toValue: isCurrent ? -33 : 0,
          useNativeDriver: true,
          tension: 60,
          friction: 7,
        }),
      );
    });

    Animated.parallel(animations).start();
  }, [activeTab, TABS, TAB_WIDTH]);

  const handlePress = (tab: TabDef) => {
    if (tab.id === activeTab) return;

    // Invitado intenta acceder a una acción protegida
    if (isGuest && tab.requiresAuth) {
      Alert.alert(
        'Inicia sesión',
        'Necesitas una cuenta para usar esta función.',
        [{ text: 'OK' }],
      );
      return;
    }

    onTabPress?.(tab.id);
  };

  return (
    <View style={styles.container}>
      {/* Barra de fondo Sage */}
      <View style={styles.tabBarBackground} />

      {/* Círculo con borde recortado que simula la muesca */}
      <Animated.View
        style={[
          styles.activeCircle,
          { transform: [{ translateX: circleX }] },
        ]}
      />

      {/* Capa superior interactiva para los botones */}
      <View style={[styles.tabBarContent, { width }]}>
        {TABS.map((tab) => {
          const globalIndex = ALL_TABS.findIndex((t) => t.id === tab.id);
          const iconSize = tab.id === 'crear' ? 32 : 26;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, { width: TAB_WIDTH }]}
              activeOpacity={0.8}
              onPress={() => handlePress(tab)}
            >
              <Animated.View
                style={{
                  transform: [{ translateY: iconAnims[globalIndex] }],
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
    height: 100,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
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
  tabBarContent: {
    height: 65,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    zIndex: 20,
  },
  tabItem: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCircle: {
    position: 'absolute',
    bottom: 33,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: C.sage,
    borderWidth: 6,
    borderColor: C.bg,
    zIndex: 15,
  },
});

