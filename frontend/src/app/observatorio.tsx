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

// Pantalla principal se desplaza un 65% a la derecha al abrir el drawer
const MAIN_TRANSLATE_X = width * 0.65;
const MAIN_SCALE = 0.85;
const MAIN_BORDER_RADIUS = 24;

// El drawer entra desde fuera de la pantalla (izquierda)
const DRAWER_WIDTH = width * 0.72;

const C = {
  bg: '#F6F6F6',
  sage: '#9EB36D',
  drawerBg: '#FFEDDA',
  scrim: 'rgba(0,0,0,0.4)',
};

export default function ObservatorioScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('observatorio');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDraftsOnCrear, setShowDraftsOnCrear] = useState(false);

  // Animación principal: controla todo con un único valor 0→1
  const anim = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  if (!fontsLoaded) return null;

  // ── Abrir con timing ease-out (275ms) ─────────────────────
  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: 275,
      useNativeDriver: true,
    }).start();
  };

  // ── Cerrar con timing ease-in (220ms) ─────────────────────
  const closeDrawer = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  };

  const handleDrawerNavigate = (target: 'sightings' | 'drafts') => {
    closeDrawer();
    if (target === 'drafts') {
      setActiveTab('crear');
      setShowDraftsOnCrear(true);
    } else if (target === 'sightings') {
      setActiveTab('comunidad');
    }
  };

  // ── Interpolaciones para la PANTALLA PRINCIPAL ────────────
  const mainTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, MAIN_TRANSLATE_X],
  });
  const mainScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, MAIN_SCALE],
  });
  const mainBorderRadius = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, MAIN_BORDER_RADIUS],
  });

  // ── Interpolaciones para el DRAWER (slide-in desde izquierda) ──
  const drawerTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  // ── Interpolaciones para el SCRIM ────────────────────────
  const scrimOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'observatorio': return <ObservatorioTab />;
      case 'documentos':   return <DocumentosTab />;
      case 'crear':        return <CrearTab
          onClose={() => setActiveTab('observatorio')}
          openGallery={showDraftsOnCrear}
          onGalleryOpened={() => setShowDraftsOnCrear(false)}
        />;
      case 'comunidad':    return <ComunidadTab />;
      case 'configuracion': return <ConfiguracionTab />;
      default:             return <ObservatorioTab />;
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={activeTab === 'crear' ? 'light-content' : 'dark-content'}
        backgroundColor={activeTab === 'crear' ? '#000000' : C.sage}
      />

      {/* ── CAPA 0: FONDO DEL DRAWER ── */}
      <View style={[styles.drawerBg, { width: DRAWER_WIDTH }]} />

      {/* ── CAPA 1: DRAWER (slide-in desde izquierda) ── */}
      {drawerOpen && (
        <Animated.View
          style={[
            styles.drawerContainer,
            { width: DRAWER_WIDTH, transform: [{ translateX: drawerTranslateX }] },
          ]}
        >
          <ProfileDrawer onClose={closeDrawer} onNavigate={handleDrawerNavigate} />
        </Animated.View>
      )}

      {/* ── CAPA 2: PANTALLA PRINCIPAL ANIMADA ── */}
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
        {/* ── SCRIM semitransparente sobre la pantalla principal ── */}
        {drawerOpen && (
          <Animated.View
            style={[styles.scrim, { opacity: scrimOpacity }]}
            pointerEvents="box-none"
          >
            <TouchableWithoutFeedback onPress={closeDrawer}>
              <View style={StyleSheet.absoluteFillObject} />
            </TouchableWithoutFeedback>
          </Animated.View>
        )}

        {/* ── HEADER ── */}
        {activeTab !== 'crear' && (
          <Header
            onAvatarPress={drawerOpen ? closeDrawer : openDrawer}
            onAddPress={() => setActiveTab('crear')}
          />
        )}

        {/* ── CONTENIDO ── */}
        <View style={styles.mainContent} pointerEvents={drawerOpen ? 'none' : 'auto'}>
          {renderTabContent()}
        </View>

        {/* ── FOOTER ── */}
        {activeTab !== 'crear' && (
          <Footer activeTab={activeTab} onTabPress={setActiveTab} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.drawerBg,
  },

  // Fondo estático detrás del drawer (visible cuando la pantalla se aleja)
  drawerBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: C.drawerBg,
  },

  // El drawer propiamente dicho: flotante desde la izquierda
  drawerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    // Sin sombra extra — la elevación visual la da el scrim sobre la pantalla principal
  },

  // Pantalla principal
  mainScreen: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    backgroundColor: C.bg,
    overflow: 'hidden',
    zIndex: 5,
  },

  // Sombra extra cuando la tarjeta está flotando — eliminada para que
  // la sombra quede solo en el panel del drawer
  mainScreenElevated: {},

  mainContent: {
    flex: 1,
  },

  // Scrim oscuro rgba(0,0,0,0.4) que cubre la pantalla principal
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.scrim,
    zIndex: 999,
  },
});