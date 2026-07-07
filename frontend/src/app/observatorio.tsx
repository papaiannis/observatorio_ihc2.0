import { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';

// Componentes Reutilizables de Estructura
import Header from '../components/Header';
import Footer, { TabType } from '../components/Footer';
import ProfileDrawer from '../components/ProfileDrawer';

// Componentes Reutilizables de Contenido (Tabs)
import ObservatorioTab from '../components/ObservatorioTab';
import DocumentosTab from '../components/DocumentosTab';
import CrearTab from '../components/CrearTab';
import ComunidadTab from '../components/ComunidadTab';
import ConfiguracionTab from '../components/ConfiguracionTab';

const { width } = Dimensions.get('window');
const DRAWER_TRANSLATE_X = width * 0.65; // La pantalla principal se desplaza un 65% a la derecha
const DRAWER_SCALE = 0.85; // La pantalla principal se encoge como tarjeta sobre mesa
const DRAWER_BORDER_RADIUS = 24;

const C = {
  bg: '#F6F6F6',
  sage: '#9EB36D',
  drawerBg: '#FFEDDA',
};

export default function ObservatorioScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('observatorio');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Animaciones del drawer
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  if (!fontsLoaded) return null;

  // ── Abrir/Cerrar el Drawer con animación ──────────────────
  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start();
  };

  const closeDrawer = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 8,
    }).start(() => {
      setDrawerOpen(false);
    });
  };

  // ── Valores interpolados para la animación ────────────────
  const mainTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, DRAWER_TRANSLATE_X],
  });

  const mainScale = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, DRAWER_SCALE],
  });

  const mainBorderRadius = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, DRAWER_BORDER_RADIUS],
  });

  // Renderizador condicional del cuerpo de la pestaña activa
  const renderTabContent = () => {
    switch (activeTab) {
      case 'observatorio':
        return <ObservatorioTab />;
      case 'documentos':
        return <DocumentosTab />;
      case 'crear':
        return <CrearTab onClose={() => setActiveTab('observatorio')} />;
      case 'comunidad':
        return <ComunidadTab />;
      case 'configuracion':
        return <ConfiguracionTab />;
      default:
        return <ObservatorioTab />;
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={activeTab === 'crear' ? 'light-content' : drawerOpen ? 'light-content' : 'dark-content'}
        backgroundColor={activeTab === 'crear' ? '#000000' : drawerOpen ? C.drawerBg : C.sage}
      />

      {/* ── CAPA DE FONDO: PERFIL ── */}
      {drawerOpen && <ProfileDrawer onClose={closeDrawer} />}

      {/* ── CAPA PRINCIPAL ANIMADA (se desliza como tarjeta) ── */}
      <Animated.View
        style={[
          styles.mainScreen,
          {
            transform: [
              { translateX: mainTranslateX },
              { scale: mainScale },
            ],
            borderRadius: mainBorderRadius,
          },
          drawerOpen && styles.mainScreenElevated,
        ]}
      >
        {/* Capa touch para cerrar si el drawer está abierto */}
        {drawerOpen && (
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <View style={styles.overlay} />
          </TouchableWithoutFeedback>
        )}

        {/* ── HEADER PERSISTENTE ── */}
        {activeTab !== 'crear' && (
          <Header
            onAvatarPress={drawerOpen ? closeDrawer : openDrawer}
            onAddPress={() => setActiveTab('crear')}
          />
        )}

        {/* ── CUERPO CON CONTENIDO INTERCAMBIABLE ── */}
        <View style={styles.mainContent} pointerEvents={drawerOpen ? 'none' : 'auto'}>
          {renderTabContent()}
        </View>

        {/* ── FOOTER PERSISTENTE CON ANIMACIÓN FLUIDA ── */}
        {activeTab !== 'crear' && <Footer activeTab={activeTab} onTabPress={setActiveTab} />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.drawerBg,
  },
  mainScreen: {
    flex: 1,
    backgroundColor: C.bg,
    overflow: 'hidden',
    // Posición absoluta para que se superponga al ProfileDrawer
    ...StyleSheet.absoluteFillObject,
  },
  mainScreenElevated: {
    shadowColor: '#000',
    shadowOffset: { width: -8, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 16,
  },
  mainContent: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: 'transparent',
  },
});