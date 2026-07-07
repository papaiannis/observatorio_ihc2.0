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
  earth: '#4A3F35',
  gray: '#A09D9A',
  sage: '#A9C26D',
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa tu usuario y contraseña.');
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
      if (!response.ok || !data.success) throw new Error(data.error || 'Error al iniciar sesión');
      await authStore.setSession(data.token, data.user);
      router.replace('/observatorio');
    } catch (error: any) {
      Alert.alert('Error de Autenticación', error.message);
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
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                selectionColor={C.sage}
              />
              <View style={styles.inputLine} />
            </View>

            {/* Contraseña */}
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="Contrasena"
                placeholderTextColor={C.gray}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
                selectionColor={C.sage}
              />
              <View style={styles.inputLine} />

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

          {/* ── Footer Link (Opcional, igual que en registro) ── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.push('/registro')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Regístrate</Text>
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
});