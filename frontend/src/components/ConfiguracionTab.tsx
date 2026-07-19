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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession, authStore } from '../utils/authStore';
import { router } from 'expo-router';

const C = {
  bg: '#F6F6F6',
  cardBg: '#FFFFFF',
  textColor: '#473C33',
  sage: '#9EB36D',
  gray: '#A09D9A',
  border: '#E8E8E8',
  white: '#FFFFFF',
  red: '#EF5350',
};

export default function ConfiguracionTab() {
  const { user } = useSession();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

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
    Alert.alert('Próximamente', 'La edición de perfil estará disponible pronto.');
  };

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
    alignItems: 'center',
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
