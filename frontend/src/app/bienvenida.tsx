import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';

const { width } = Dimensions.get('window');

// ── Paleta Ajustada al Diseño ───────────────────────────
const C = {
  white: '#FFFFFF',
  earth: '#3D312A', // Marrón oscuro extraído directamente de tu imagen
};

export default function BienvenidaScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const btn1Anim = useRef(new Animated.Value(0)).current;
  const btn2Anim = useRef(new Animated.Value(0)).current;
  const linkAnim = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.stagger(100, [
        Animated.timing(btn1Anim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(btn2Anim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(linkAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* Título Principal */}
      <Animated.View
        style={[styles.textArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <Text style={styles.title}>Bienvenido!</Text>
      </Animated.View>

      {/* Botones y Enlace */}
      <View style={styles.actionsArea}>
        <Animated.View style={{ opacity: btn1Anim, width: '100%', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.btnPrimary}
            activeOpacity={0.85}
            onPress={() => router.push('/registro')}
          >
            <Text style={styles.btnPrimaryText}>Crear una cuenta</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ opacity: btn2Anim, width: '100%', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.btnSecondary}
            activeOpacity={0.85}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.btnSecondaryText}>Iniciar Sesion</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ opacity: linkAnim, marginTop: 10 }}>
          <TouchableOpacity
            style={styles.guestLink}
            activeOpacity={0.7}
            onPress={() => router.push('/observatorio')}
          >
            <Text style={styles.guestLinkText}>Entrar como visitante</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center', // Sigue centrando, pero el padding superior añade un tope arriba
    paddingHorizontal: 36,
    paddingTop: 45, // <─── AGREGA ESTA LÍNEA (puedes variar el número de 40 a 80 según veas)
  },

  // ── Texto Principal ──────────────────────────────────
  textArea: {
    alignItems: 'center',
    marginBottom: 50, // Espacio exacto entre el título y el primer botón
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    color: C.earth,
    textAlign: 'center',
  },

  // ── Botones ──────────────────────────────────────────
  actionsArea: {
    width: '100%',
    gap: 16, // Espaciado uniforme entre botones
    alignItems: 'center',
  },
  btnPrimary: {
    width: width - 72,
    backgroundColor: C.earth,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    // Sombras eliminadas para igualar el estilo plano de tu imagen
  },
  btnPrimaryText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: C.white,
  },
  btnSecondary: {
    width: width - 72,
    backgroundColor: C.white,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: C.earth,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: C.earth,
  },

  // ── Enlace Visitante ─────────────────────────────────
  guestLink: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  guestLinkText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.earth,
    // Subrayado y opacidad eliminados para que luzca sólido como en la imagen
  },
});