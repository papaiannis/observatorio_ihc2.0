import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { authStore } from '../utils/authStore';

const { width } = Dimensions.get('window');

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ihcobservatorio2-202625.onrender.com';

// ── Paleta Ajustada ─────────────────────────────────────
const C = {
  bg: '#F7F7F7',
  white: '#FFFFFF',
  forest: '#263126',
  earth: '#4A3F35',
  sage: '#A9C26D',
  gray: '#A09D9A',
};

type UserType = 'experto' | 'entusiasta';

export default function RegistroScreen() {
  const [userType, setUserType] = useState<UserType>('experto');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const handleRegistro = async () => {
    if (!nombre || !correo || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email: correo, password, tipo: userType }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Error al registrarse');
      await authStore.setSession(data.token, data.user);
      router.replace('/observatorio');
    } catch (error: any) {
      Alert.alert('Error de Registro', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Imagen Superior (Full Width) ── */}
        <View style={styles.heroWrapper}>
          <Image
            source={require('@/assets/images/tepui_hero.png')}
            style={styles.heroImage}
            contentFit="cover"
          />
          {/* Botón de regreso */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={C.earth} />
          </TouchableOpacity>
        </View>

        {/* ── Área del Formulario ── */}
        <View style={styles.formArea}>
          <Text style={styles.title}>Bienvenido</Text>

          {/* ── Toggle Experto / Entusiasta ── */}
          <View style={styles.toggleWrapper}>
            <TouchableOpacity
              style={[styles.toggleBtn, userType === 'experto' && styles.toggleBtnActive]}
              onPress={() => setUserType('experto')}
              activeOpacity={0.8}
            >
              <Text style={styles.toggleText}>Experto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, userType === 'entusiasta' && styles.toggleBtnActive]}
              onPress={() => setUserType('entusiasta')}
              activeOpacity={0.8}
            >
              <Text style={styles.toggleText}>Entusiasta</Text>
            </TouchableOpacity>
          </View>

          {/* ── Campos de texto ── */}
          <View style={styles.inputsContainer}>
            {/* Nombre completo */}
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="Nombre completo / usuario"
                placeholderTextColor={C.gray}
                value={nombre}
                onChangeText={setNombre}
                autoCapitalize="words"
                selectionColor={C.sage}
              />
              <View style={styles.inputLine} />
            </View>

            {/* Correo */}
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="Correo"
                placeholderTextColor={C.gray}
                value={correo}
                onChangeText={setCorreo}
                autoCapitalize="none"
                keyboardType="email-address"
                selectionColor={C.sage}
              />
              <View style={styles.inputLine} />
            </View>

            {/* Contraseña con Ojito */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Contrasena"
                  placeholderTextColor={C.gray}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  selectionColor={C.sage}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={C.gray}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.inputLine} />
            </View>
          </View>

          {/* ── Botón Entrar Ancho ── */}
          <TouchableOpacity
            style={styles.btnEntrar}
            onPress={handleRegistro}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color={C.white} />
              : <Text style={styles.btnEntrarText}>Entrar</Text>
            }
          </TouchableOpacity>

          {/* ── Footer Link ── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.push('/login')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flexGrow: 1,
  },

  // ── Imagen Superior (Full Width) ──────────────────────
  heroWrapper: {
    width: '100%',
    height: 280, // Altura ajustada para que el Tepuy se vea bien
    borderBottomLeftRadius: 28, // Curvas solo abajo
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    marginBottom: 24,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backBtn: {
    position: 'absolute',
    top: 50, // Respetando la barra de estado (notch)
    left: 20,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // Fondo sutil para que la flecha resalte sobre la foto
    borderRadius: 20,
  },

  // ── Formulario ────────────────────────────────────────
  formArea: {
    flex: 1,
    paddingHorizontal: 10, // Margen horizontal reducido para que el botón sea más ancho
    paddingBottom: 40,
  },
  title: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 26,
    color: C.earth,
    textAlign: 'center',
    marginBottom: 20,
  },

  // ── Toggle Centrado ───────────────────────────────────
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: C.forest,
    borderRadius: 30,
    alignSelf: 'center',
    width: '85%',
    height: 42,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  toggleBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
  toggleBtnActive: {
    backgroundColor: C.sage,
  },
  toggleText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.white,
  },

  // ── Inputs ────────────────────────────────────────────
  inputsContainer: {
    width: '100%',
    paddingHorizontal: 16, // Manteniendo los inputs un poco más centrados respecto al botón
  },
  inputGroup: {
    marginBottom: 24,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.earth,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  inputLine: {
    height: 1,
    backgroundColor: C.gray,
    marginTop: 2,
  },
  eyeBtn: {
    padding: 4,
  },

  // ── Botón Principal Ancho ─────────────────────────────
  btnEntrar: {
    width: '100%', // Abarca todo el ancho disponible (menos el paddingHorizontal de 24)
    backgroundColor: C.earth,
    borderRadius: 18,
    paddingVertical: 30,
    alignItems: 'center',
    marginTop: 40,
    shadowColor: C.earth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  btnEntrarText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 20,
    color: C.white,
  },

  // ── Footer ────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: C.gray,
  },
  footerLink: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: C.earth,
  },
});