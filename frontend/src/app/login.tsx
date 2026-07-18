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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ihc-2-0.onrender.com';

// ── Paleta Ajustada ─────────────────────────────────────
const C = {
  bg: '#F7F7F7',
  white: '#FFFFFF',
  earth: '#4A3F35',
  gray: '#A09D9A',
  sage: '#A9C26D',
};

const translateError = (msg: string): string => {
  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'La contraseña no es válida.';
  }
  if (lower.includes('user not found') || lower.includes('user_not_found') || lower.includes('not found') || lower.includes('no existe')) {
    return 'El usuario no existe.';
  }
  if (lower.includes('email not confirmed')) {
    return 'El correo electrónico aún no ha sido verificado.';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection')) {
    return 'Error de conexión. Por favor, verifica tu red.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Demasiados intentos de inicio de sesión. Inténtalo más tarde.';
  }
  return 'Ocurrió un error. Por favor, inténtalo de nuevo.';
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const handleLogin = async () => {
    setEmailError(null);
    setPasswordError(null);

    if (!email) {
      setEmailError('Por favor ingresa tu usuario.');
      return;
    }
    if (!password) {
      setPasswordError('Por favor ingresa tu contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        const errMsg = data.error || 'Error al iniciar sesión';
        const lowerMsg = errMsg.toLowerCase();

        if (
          lowerMsg.includes('user not found') ||
          lowerMsg.includes('user_not_found') ||
          lowerMsg.includes('no existe') ||
          lowerMsg.includes('not found')
        ) {
          setEmailError('El usuario no existe.');
        } else {
          setPasswordError(translateError(errMsg));
        }
        return;
      }

      await authStore.setSession(data.token, data.user);
      router.replace('/observatorio');
    } catch (error: any) {
      setPasswordError(translateError(error.message));
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

          <View style={styles.inputsContainer}>
            {/* Usuario */}
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="Usuario"
                placeholderTextColor={C.gray}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  setEmailError(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                selectionColor={C.sage}
              />
              <View style={[styles.inputLine, emailError ? styles.inputLineError : null]} />
              {emailError && <Text style={styles.errorText}>{emailError}</Text>}
            </View>

            {/* Contraseña */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Contraseña"
                  placeholderTextColor={C.gray}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setPasswordError(null);
                  }}
                  secureTextEntry={!showPassword}
                  selectionColor={C.sage}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={C.gray}
                  />
                </TouchableOpacity>
              </View>
              <View style={[styles.inputLine, passwordError ? styles.inputLineError : null]} />
              {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}

              {/* No recuerdo la contraseña */}
              <TouchableOpacity style={styles.forgotWrapper} activeOpacity={0.7}>
                <Text style={styles.forgotText}>No recuerdo la contraseña</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Spacer para empujar el botón si la pantalla es muy alta */}
          <View style={{ flex: 1 }} />

          {/* ── Botón Entrar Ancho ── */}
          <TouchableOpacity
            style={styles.btnEntrar}
            onPress={handleLogin}
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
            <Text style={styles.footerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.push('/registro')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Regístrate</Text>
            </TouchableOpacity>
          </View>

          {/* ── Guest Link ── */}
          <View style={styles.guestFooter}>
            <TouchableOpacity onPress={() => router.replace('/observatorio')} activeOpacity={0.7}>
              <Text style={[styles.footerLink, { color: C.sage }]}>Entrar como visitante</Text>
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
    height: 280,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    marginBottom: 40, // Más espacio debajo de la imagen
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backBtn: {
    position: 'absolute',
    top: 50, // Respetando la barra de estado
    left: 20,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // Fondo sutil
    borderRadius: 20,
  },

  // ── Formulario ────────────────────────────────────────
  formArea: {
    flex: 1,
    paddingHorizontal: 16, // Margen horizontal pequeño para que el botón sea ancho
    paddingBottom: 40,
    minHeight: 400,
  },
  title: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 26,
    color: C.earth,
    textAlign: 'center',
    marginBottom: 40, // Más espacio debajo del título en Login
  },

  // ── Inputs ────────────────────────────────────────────
  inputsContainer: {
    width: '100%',
    paddingHorizontal: 24, // Inputs un poco más centrados respecto al botón
  },
  inputGroup: {
    marginBottom: 36, // Más espacio entre campos que en registro
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
  inputLineError: {
    backgroundColor: '#EF5350', // Línea roja al haber error
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  errorText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#EF5350', // Texto rojo para el error
    marginTop: 6,
  },
  forgotWrapper: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11, // Letra pequeña como en el diseño
    color: C.earth,
  },

  // ── Botón Principal Ancho ─────────────────────────────
  btnEntrar: {
    width: '100%', // Abarca todo el ancho disponible
    backgroundColor: C.earth,
    borderRadius: 18,
    paddingVertical: 30, // Altura aumentada como pediste
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
  guestFooter: {
    alignItems: 'center',
    marginTop: 16,
  },
});