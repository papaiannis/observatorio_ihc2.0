import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authStore } from '../utils/authStore';

const { width, height } = Dimensions.get('window');

const C = {
  drawerBg: '#FFEDDA',
  forest: '#1E2A21',
  earth: '#4A3F35',
  sage: '#9EB36D',
  white: '#FFFFFF',
  cream: '#FCECDA',
  lightText: 'rgba(74,63,53,0.55)',
  divider: 'rgba(74,63,53,0.12)',
};

interface ProfileDrawerProps {
  onClose: () => void;
  onNavigate?: (target: 'sightings' | 'drafts') => void;
}

interface MenuItem {
  icon: string;
  label: string;
  library: 'ionicons' | 'material';
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'binoculars', label: 'Mis Avistamientos', library: 'material' },
  { icon: 'folder-outline', label: 'Mis Proyectos', library: 'ionicons' },
  { icon: 'document-text-outline', label: 'Borradores', library: 'ionicons' },
  { icon: 'create-outline', label: 'Editar Perfil', library: 'ionicons' },
];

export default function ProfileDrawer({ onClose, onNavigate }: ProfileDrawerProps) {
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState('Usuario');
  const [userBio, setUserBio] = useState('Explorador de la naturaleza venezolana 🌿');
  const [userRole, setUserRole] = useState('Entusiasta');

  useEffect(() => {
    const loadUser = async () => {
      const { user } = await authStore.getSession();
      if (user) {
        setUserName(user.nombre || user.username || 'Usuario');
        if (user.role) setUserRole(user.role);
      }
    };
    loadUser();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Foto de Perfil ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              <Ionicons name="person" size={42} color={C.earth} />
            </View>
          </View>
        </View>

        {/* ── Nombre y Bio ── */}
        <View style={styles.infoSection}>
          <Text style={styles.greeting}>Bienvenido,</Text>
          <Text style={styles.userName}>{userName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{userRole}</Text>
          </View>
          <Text style={styles.bio}>{userBio}</Text>
        </View>

        {/* ── Separador ── */}
        <View style={styles.divider} />

        {/* ── Opciones del Menú ── */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => onNavigate?.('sightings')}
          >
            <MaterialCommunityIcons name="binoculars" size={24} color={C.sage} />
            <Text style={styles.menuLabel}>Mis Avistamientos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={onClose}>
            <Ionicons name="folder-outline" size={24} color={C.sage} />
            <Text style={styles.menuLabel}>Mis Proyectos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => onNavigate?.('drafts')}
          >
            <Ionicons name="document-text-outline" size={24} color={C.sage} />
            <Text style={styles.menuLabel}>Borradores</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={onClose}>
            <Ionicons name="create-outline" size={24} color={C.sage} />
            <Text style={styles.menuLabel}>Editar Perfil</Text>
          </TouchableOpacity>
        </View>

        {/* ── Separador ── */}
        <View style={styles.divider} />

        {/* ── Cerrar Sesión ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.7}
          onPress={async () => {
            await authStore.clearSession();
            onClose();
          }}
        >
          <Ionicons name="log-out-outline" size={24} color="#E57373" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.drawerBg,
    paddingHorizontal: 28,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ── Avatar ─────────────────────────────────────────────
  avatarSection: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: C.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Nombre / Bio ──────────────────────────────────────
  infoSection: {
    marginBottom: 28,
  },
  greeting: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.lightText,
    marginBottom: 2,
  },
  userName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
    color: C.forest,
    lineHeight: 34,
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(158,179,109,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
  },
  roleText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: C.sage,
  },
  bio: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
  },

  // ── Divisor ────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: C.divider,
    marginVertical: 8,
  },

  // ── Menú ────────────────────────────────────────────────
  menuSection: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 18,
  },
  menuLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: C.earth,
  },

  // ── Logout ─────────────────────────────────────────────
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 18,
  },
  logoutText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: '#E57373',
  },
});
