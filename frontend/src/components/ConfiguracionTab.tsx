import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSession, authStore } from '../utils/authStore';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihcobservatorio2-202625.onrender.com';

const C = {
  bg: '#F6F6F6',
  cardBg: '#FFFFFF',
  textColor: '#473C33',
  sage: '#9EB36D',
  sageBg: 'rgba(158,179,109,0.15)',
  gray: '#A09D9A',
  border: '#E8E8E8',
  white: '#FFFFFF',
  red: '#EF5350',
};

export default function ConfiguracionTab() {
  const { user } = useSession();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  // ── Edición de Perfil ──────────────────────────────────
  const [view, setView] = useState<'settings' | 'editProfile'>('settings');
  const [editBio, setEditBio] = useState('');
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar tu sesión actual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await authStore.clearSession();
            router.replace('/bienvenida');
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleEditProfile = () => {
    if (!user) {
      Alert.alert('Invitado', 'Inicia sesión para editar tu perfil.');
      return;
    }
    const bioText = user.bio || (user as any).preferencias?.bio || 'Explorador de la naturaleza venezolana 🌿';
    setEditBio(bioText);
    setTempAvatar(user.avatar_url || null);
    setView('editProfile');
  };

  const pickNewAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto de perfil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    setTempAvatar(result.assets[0].uri);
  };

  const saveProfileChanges = async () => {
    if (savingProfile || !user) return;
    setSavingProfile(true);
    try {
      const { token } = await authStore.getSession();

      let finalAvatarUrl = user.avatar_url;
      if (tempAvatar && tempAvatar !== user.avatar_url) {
        const formData = new FormData();
        const filename = tempAvatar.split('/').pop() || 'avatar.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        formData.append('avatar', { uri: tempAvatar, name: filename, type } as any);

        const resImg = await fetch(`${API_URL}/api/v1/profiles/me`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (resImg.ok) {
          const dataImg = await resImg.json();
          if (dataImg?.avatar_url) finalAvatarUrl = dataImg.avatar_url;
        } else {
          finalAvatarUrl = tempAvatar;
        }
      }

      const resBio = await fetch(`${API_URL}/api/v1/profiles/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferencias: { bio: editBio } }),
      });

      await authStore.updateUser({ avatar_url: finalAvatarUrl, bio: editBio });

      Alert.alert('¡Éxito!', 'Tu perfil ha sido actualizado exitosamente.');
      setView('settings');
    } catch (err) {
      Alert.alert('Error', 'No se pudieron guardar los cambios. Verifica tu conexión a internet.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (view === 'editProfile') {
    return (
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => setView('settings')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={C.textColor} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Editar Perfil</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.editCard}>
            <View style={styles.avatarEditContainer}>
              <TouchableOpacity onPress={pickNewAvatar} activeOpacity={0.8} style={styles.avatarEditWrap}>
                {tempAvatar ? (
                  <Image source={{ uri: tempAvatar }} style={styles.largeAvatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { width: 96, height: 96, borderRadius: 48 }]}>
                    <Ionicons name="person" size={44} color={C.textColor} />
                  </View>
                )}
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={18} color={C.white} />
                </View>
              </TouchableOpacity>
              <Text style={styles.avatarHint}>Toca la imagen para cambiar de foto</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Nombre de Usuario (Solo lectura)</Text>
              <View style={[styles.textInput, styles.readOnlyInput]}>
                <Text style={styles.readOnlyText}>{user?.nombre || user?.username || 'Usuario'}</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Correo Electrónico</Text>
              <View style={[styles.textInput, styles.readOnlyInput]}>
                <Text style={styles.readOnlyText}>{user?.email}</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Biografía</Text>
              <TextInput
                style={[styles.textInput, styles.bioInput]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Cuéntanos sobre tu pasión por la naturaleza..."
                placeholderTextColor={C.gray}
                multiline
                maxLength={200}
              />
              <Text style={styles.charCounter}>{editBio.length}/200</Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, savingProfile && { opacity: 0.6 }]}
              onPress={saveProfileChanges}
              disabled={savingProfile}
              activeOpacity={0.8}
            >
              {savingProfile ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={C.white} />
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── TÍTULO DE PANTALLA ── */}
      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>Configuración</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── TARJETA DE PERFIL (SI ESTÁ CONECTADO) ── */}
        <View style={styles.profileCard}>
          {user ? (
            <>
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={28} color={C.textColor} />
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user.nombre || user.username || 'Usuario'}</Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{user.role || 'Entusiasta'}</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.avatarPlaceholder, styles.guestAvatar]}>
                <Ionicons name="eye-outline" size={28} color={C.textColor} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>Modo Visitante</Text>
                <Text style={styles.profileEmail}>Inicia sesión para usar más funciones</Text>
                <TouchableOpacity
                  style={styles.loginLink}
                  activeOpacity={0.7}
                  onPress={() => router.replace('/login')}
                >
                  <Text style={styles.loginLinkText}>Iniciar Sesión</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* ── SECCIÓN DE AJUSTES GENERALES ── */}
        <Text style={styles.sectionHeader}>Ajustes de la Aplicación</Text>

        <View style={styles.settingsGroup}>
          {/* Opción de Modo Oscuro */}
          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <View style={[styles.iconBg, { backgroundColor: '#ECEFF1' }]}>
                <Ionicons name="moon" size={18} color={C.textColor} />
              </View>
              <Text style={styles.settingLabel}>Modo Oscuro</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: C.gray, true: C.sage }}
              thumbColor={darkMode ? C.white : '#F4F3F0'}
            />
          </View>

          <View style={styles.divider} />

          {/* Opción de Notificaciones */}
          <View style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <View style={[styles.iconBg, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="notifications" size={18} color={C.sage} />
              </View>
              <Text style={styles.settingLabel}>Notificaciones Push</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: C.gray, true: C.sage }}
              thumbColor={notifications ? C.white : '#F4F3F0'}
            />
          </View>
        </View>

        {/* ── SECCIÓN DE CUENTA Y SEGURIDAD ── */}
        <Text style={styles.sectionHeader}>Cuenta y Preferencias</Text>

        <View style={styles.settingsGroup}>
          <TouchableOpacity style={styles.settingItem} onPress={handleEditProfile} activeOpacity={0.7}>
            <View style={styles.settingItemLeft}>
              <View style={[styles.iconBg, { backgroundColor: '#E1F5FE' }]}>
                <Ionicons name="person-circle-outline" size={20} color="#03A9F4" />
              </View>
              <Text style={styles.settingLabel}>Editar Perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.gray} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingItem} activeOpacity={0.7} onPress={() => Alert.alert('Idioma', 'El idioma actualmente está configurado en Español.')}>
            <View style={styles.settingItemLeft}>
              <View style={[styles.iconBg, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="globe-outline" size={20} color="#FF9800" />
              </View>
              <Text style={styles.settingLabel}>Idioma</Text>
            </View>
            <Text style={styles.settingValText}>Español</Text>
          </TouchableOpacity>
        </View>

        {/* ── ACCIONES FINALES ── */}
        {user ? (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color={C.red} />
            <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.replace('/login')} activeOpacity={0.8}>
            <Ionicons name="log-in-outline" size={20} color={C.white} />
            <Text style={styles.loginBtnText}>Iniciar Sesión</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.versionText}>Observatorio IHC v2.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  titleRow: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  screenTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    color: C.textColor,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Previene colisiones con el footer absoluto
    gap: 16,
  },

  // Tarjeta de Perfil
  profileCard: {
    backgroundColor: C.cardBg,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    resizeMode: 'cover',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(71,60,51,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestAvatar: {
    backgroundColor: 'rgba(158,179,109,0.15)',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: C.textColor,
  },
  profileEmail: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.textColor,
    opacity: 0.6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.sageBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  roleText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    color: C.sage,
    textTransform: 'uppercase',
  },
  loginLink: {
    marginTop: 4,
  },
  loginLinkText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: C.sage,
    textDecorationLine: 'underline',
  },

  // Edición de Perfil (estilos)
  editCard: {
    backgroundColor: C.cardBg,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    gap: 20,
  },
  avatarEditContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarEditWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  largeAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    resizeMode: 'cover',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.sage,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.white,
  },
  avatarHint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.gray,
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: C.textColor,
  },
  textInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.textColor,
    backgroundColor: '#FAFAFA',
  },
  readOnlyInput: {
    backgroundColor: '#F0F0F0',
    borderColor: '#E0E0E0',
  },
  readOnlyText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#707070',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  charCounter: {
    alignSelf: 'flex-end',
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: C.gray,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.sage,
    borderRadius: 18,
    paddingVertical: 16,
    marginTop: 10,
  },
  saveButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: C.white,
  },

  // Ajustes
  sectionHeader: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.textColor,
    opacity: 0.5,
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsGroup: {
    backgroundColor: C.cardBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: C.textColor,
  },
  settingValText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: C.gray,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 20,
  },

  // Botones finales
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFEBEE',
    borderRadius: 18,
    paddingVertical: 16,
    marginTop: 10,
  },
  logoutBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: C.red,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.textColor,
    borderRadius: 18,
    paddingVertical: 16,
    marginTop: 10,
  },
  loginBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: C.white,
  },
  versionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: C.gray,
    textAlign: 'center',
    marginTop: 20,
  },
});
