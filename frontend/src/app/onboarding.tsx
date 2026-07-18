import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import * as ImagePicker from 'expo-image-picker';
import { authStore } from '../utils/authStore';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ihc-2-0.onrender.com';

const C = {
  bg: '#F7F7F7',
  white: '#FFFFFF',
  forest: '#263126',
  earth: '#4A3F35',
  sage: '#A9C26D',
  gray: '#A09D9A',
  sageLight: '#E8EFE0',
  red: '#EF5350',
};

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    authStore.getSession().then(({ token }) => {
      setToken(token);
    });
  }, []);

  if (!fontsLoaded) return null;

  // ── Selección / Captura de Foto ─────────────────────────
  const handleSelectPhoto = async (useCamera: boolean) => {
    try {
      let status;
      if (useCamera) {
        status = (await ImagePicker.requestCameraPermissionsAsync()).status;
      } else {
        status = (await ImagePicker.requestMediaLibraryPermissionsAsync()).status;
      }

      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos accesos para poder cargar tu foto.');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.75,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.75,
          });

      if (result.canceled || !result.assets?.length) return;

      const uri = result.assets[0].uri;
      setAvatarUri(uri);
    } catch (e) {
      Alert.alert('Error', 'No se pudo seleccionar la foto.');
    }
  };

  // ── Guardar Foto en Storage ─────────────────────────────
  const uploadAvatar = async () => {
    if (!avatarUri || !token) return;
    setLoading(true);
    try {
      const formData = new FormData();
      const filename = avatarUri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('avatar', { uri: avatarUri, name: filename, type } as any);

      const response = await fetch(`${API_URL}/api/v1/profiles/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Error al subir foto');

      // Actualizar localmente
      await authStore.updateUser({ avatar_url: data.profile?.avatar_url || avatarUri });
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error de Carga', 'No pudimos subir tu foto al servidor, pero continuaremos de igual manera.');
    } finally {
      setLoading(false);
    }
  };

  // ── Guardar Biografía en Backend ────────────────────────
  const saveBio = async () => {
    if (!bio.trim() || !token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/profiles/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferencias: { bio } }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Error al guardar biografía');

      // Actualizar localmente
      await authStore.updateUser({ bio });
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', 'No pudimos guardar tu biografía, pero continuaremos.');
    } finally {
      setLoading(false);
    }
  };

  // ── Avances de Pasos ────────────────────────────────────
  const nextStep = async () => {
    if (step === 1) {
      if (avatarUri) {
        await uploadAvatar();
      }
      setStep(2);
    } else if (step === 2) {
      if (bio.trim()) {
        await saveBio();
      }
      setStep(3);
    }
  };

  const skipStep = () => {
    if (step === 1) {
      setAvatarUri(null);
      setStep(2);
    } else if (step === 2) {
      setBio('');
      setStep(3);
    }
  };

  const finishOnboarding = (openCamera: boolean) => {
    if (openCamera) {
      router.replace({ pathname: '/observatorio', params: { openCamera: 'true' } });
    } else {
      router.replace('/observatorio');
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header con indicador de pasos */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Configura tu Perfil</Text>
            <View style={styles.progressRow}>
              {[1, 2, 3].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.progressDot,
                    step >= s ? styles.progressDotActive : null,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* ── PASO 1: FOTO DE PERFIL ──────────────────────── */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="camera-outline" size={32} color={C.white} />
              </View>
              <Text style={styles.title}>Foto de perfil</Text>
              <Text style={styles.subtitle}>
                Coloca una foto para que la comunidad te reconozca en tus avistamientos y contribuciones.
              </Text>

              {/* Avatar Selector */}
              <View style={styles.avatarContainer}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <FontAwesome name="user" size={70} color={C.gray} />
                  </View>
                )}
                <View style={styles.photoActionsRow}>
                  <TouchableOpacity
                    style={styles.photoOptionBtn}
                    onPress={() => handleSelectPhoto(false)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="images" size={20} color={C.forest} />
                    <Text style={styles.photoOptionText}>Galería</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.photoOptionBtn}
                    onPress={() => handleSelectPhoto(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera" size={20} color={C.forest} />
                    <Text style={styles.photoOptionText}>Cámara</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={nextStep}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {avatarUri ? 'Guardar y Continuar' : 'Siguiente'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={skipStep}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipBtnText}>Omitir este paso</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── PASO 2: BIOGRAFÍA ──────────────────────────── */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="create-outline" size={32} color={C.white} />
              </View>
              <Text style={styles.title}>Cuéntanos sobre ti</Text>
              <Text style={styles.subtitle}>
                Escribe una breve biografía sobre tus intereses, profesión o pasión por la flora y fauna de la región.
              </Text>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textArea}
                  placeholder="Tu biografía (ej. Especialista en orquídeas, entusiasta de aves de Guayana, etc.)"
                  placeholderTextColor={C.gray}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                  maxLength={160}
                  selectionColor={C.sage}
                />
                <Text style={styles.charCount}>{bio.length}/160</Text>
              </View>

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={nextStep}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {bio.trim() ? 'Guardar y Continuar' : 'Siguiente'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={skipStep}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipBtnText}>Omitir este paso</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── PASO 3: PRIMER AVISTAMIENTO ────────────────── */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="eye-outline" size={32} color={C.white} />
              </View>
              <Text style={styles.title}>¡Todo listo!</Text>
              <Text style={styles.subtitle}>
                Tu perfil ha sido configurado con éxito. ¿Qué tal si compartes tu primer avistamiento para comenzar a colaborar?
              </Text>

              <View style={styles.welcomeCard}>
                <Ionicons name="image-outline" size={48} color={C.sage} />
                <Text style={styles.welcomeCardText}>
                  Toma fotos de aves, plantas u hongos a tu alrededor y compártelos con la comunidad científica.
                </Text>
              </View>

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => finishOnboarding(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={20} color={C.white} style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Subir avistamiento</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipBtn}
                  onPress={() => finishOnboarding(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipBtnText}>Omitir y finalizar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: C.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  progressDot: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E2E2',
  },
  progressDotActive: {
    backgroundColor: C.sage,
  },

  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 460,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: C.forest,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    color: C.earth,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.gray,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
    marginBottom: 30,
  },

  // Avatar selector
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#EAEAEA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: C.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: C.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  photoActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 18,
  },
  photoOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.white,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  photoOptionText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: C.forest,
  },

  // Input Biografía
  inputWrapper: {
    width: '100%',
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  textArea: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.earth,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: C.gray,
    alignSelf: 'flex-end',
    marginTop: 6,
  },

  // Welcome Card (Avistamiento)
  welcomeCard: {
    width: '100%',
    backgroundColor: C.sageLight,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    marginBottom: 30,
  },
  welcomeCardText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13.5,
    color: C.forest,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Acciones
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: C.forest,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: C.forest,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: C.white,
  },
  skipBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipBtnText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: C.gray,
  },
});
