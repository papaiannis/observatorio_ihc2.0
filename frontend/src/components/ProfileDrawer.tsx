import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { authStore } from '../utils/authStore';
import { photoStore, StoredPhoto } from '../utils/photoStore';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihc-2-0.onrender.com';

const C = {
  drawerBg: '#FFEDDA',
  forest: '#1E2A21',
  earth: '#4A3F35',
  sage: '#9EB36D',
  white: '#FFFFFF',
  cream: '#FCECDA',
  border: 'rgba(74,63,53,0.15)',
  divider: 'rgba(74,63,53,0.12)',
  lightText: 'rgba(74,63,53,0.55)',
  gray: '#A09D9A',
  red: '#E57373',
};

type DrawerView = 'home' | 'sightings' | 'drafts' | 'edit' | 'projects';

interface ProfileDrawerProps {
  onClose: () => void;
  onNavigate?: (target: 'sightings' | 'drafts' | 'tracking', data?: any) => void;
}

interface Sighting {
  id: string;
  photo_url: string;
  preliminary_species?: string;
  status: string;
  observed_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En espera',
  validated: 'Validado',
  rejected: 'Rechazado',
  in_review: 'En revisión',
};

export default function ProfileDrawer({ onClose, onNavigate }: ProfileDrawerProps) {
  const insets = useSafeAreaInsets();

  // ── Estado del usuario ─────────────────────────────────
  const [userName, setUserName] = useState('Usuario');
  const [userBio, setUserBio] = useState('Explorador de la naturaleza venezolana 🌿');
  const [userRole, setUserRole] = useState('Entusiasta');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // ── Vista activa ───────────────────────────────────────
  const [view, setView] = useState<DrawerView>('home');

  // ── Datos de sub-vistas ────────────────────────────────
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loadingSightings, setLoadingSightings] = useState(false);
  const [drafts, setDrafts] = useState<StoredPhoto[]>([]);

  // ── Edición de perfil ──────────────────────────────────
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Cargar sesión al montar ────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { user, token: t } = await authStore.getSession();
      if (user) {
        setUserName(user.nombre || user.username || 'Usuario');
        if (user.role) setUserRole(user.role);
        if (user.avatar_url) setAvatarUri(user.avatar_url);
        setUserId(user.id);
        setToken(t);
      }
    };
    load();
  }, []);

  // ── Mis proyectos (subscripciones) ───────────────────
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // ── Cargar mis avistamientos ────────────────────────────
  const loadSightings = useCallback(async () => {
    if (!token) return;
    setLoadingSightings(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/sightings/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSightings(data.sightings || []);
      }
    } catch {}
    setLoadingSightings(false);
  }, [token]);

  // ── Cargar proyectos donde participo ──────────────────
  const loadProjects = useCallback(async () => {
    if (!token) return;
    setLoadingProjects(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/investigations/my-subscriptions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.investigations || []);
      }
    } catch {}
    setLoadingProjects(false);
  }, [token]);


  // ── Navegar a sub-vistas ────────────────────────────────
  const goTo = (v: DrawerView) => {
    if (v === 'sightings') loadSightings();
    if (v === 'drafts') photoStore.getAll().then(setDrafts);
    if (v === 'edit') setEditBio(userBio);
    if (v === 'projects') loadProjects();
    setView(v);
  };

  // ── Subir foto de perfil ───────────────────────────────
  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto de perfil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const uri = result.assets[0].uri;

    // Por ahora usamos la URI local como avatar (en producción se subiría a Storage)
    setAvatarUri(uri);
    await authStore.updateUser({ avatar_url: uri });

    // Intentar sincronizar con el backend enviando la imagen con FormData
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('avatar', { uri, name: filename, type } as any);

      await fetch(`${API_URL}/api/v1/profiles/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          // No establecer Content-Type para FormData, fetch lo generará con el boundary
        },
        body: formData,
      });
    } catch (e) {
      console.error(e);
    }
  };

  // ── Guardar edición de perfil ──────────────────────────
  const saveProfile = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/v1/profiles/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferencias: { bio: editBio } }),
      });
      setUserBio(editBio);
      Alert.alert('¡Guardado!', 'Tu perfil fue actualizado.');
      setView('home');
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar borrador ───────────────────────────────────
  const deleteDraft = (uri: string) => {
    Alert.alert('Eliminar borrador', '¿Deseas eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const updated = await photoStore.removePhoto(uri);
          setDrafts(updated);
        },
      },
    ]);
  };

  // ─────────────────────────────────────────────────────────
  // SUB-VISTA: Mis Proyectos (subscripciones)
  // ─────────────────────────────────────────────────────────
  if (view === 'projects') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setView('home')} style={styles.subBackBtn}>
            <Ionicons name="arrow-back" size={22} color={C.earth} />
          </TouchableOpacity>
          <Text style={styles.subTitle}>Mis Proyectos</Text>
        </View>

        {loadingProjects ? (
          <View style={styles.centered}>
            <ActivityIndicator color={C.sage} size="large" />
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No participas en ningún proyecto aún</Text>
          </View>
        ) : (
          <FlatList
            data={projects}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.projectCard}>
                <View style={styles.projectIconWrap}>
                  <Ionicons name="leaf-outline" size={22} color={C.sage} />
                </View>
                <View style={styles.projectInfo}>
                  <Text style={styles.projectTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.projectStatus}>
                    {item.status === 'active' ? '● Activo' : '○ Inactivo'}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────
  // SUB-VISTA: Mis Avistamientos
  // ─────────────────────────────────────────────────────────
  if (view === 'sightings') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setView('home')} style={styles.subBackBtn}>
            <Ionicons name="arrow-back" size={22} color={C.earth} />
          </TouchableOpacity>
          <Text style={styles.subTitle}>Mis Avistamientos</Text>
        </View>

        {loadingSightings ? (
          <View style={styles.centered}>
            <ActivityIndicator color={C.sage} size="large" />
          </View>
        ) : sightings.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Aún no hay avistamientos</Text>
          </View>
        ) : (
          <FlatList
            data={sightings}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isValidated = item.status === 'validated';
              const CardWrapper = isValidated ? View : TouchableOpacity;
              return (
                <CardWrapper
                  style={styles.sightingCard}
                  activeOpacity={0.75}
                  onPress={isValidated ? undefined : () => {
                    onNavigate?.('tracking', item);
                  }}
                >
                  <Image source={{ uri: item.photo_url }} style={styles.sightingThumb} resizeMode="cover" />
                  <View style={styles.sightingInfo}>
                    <Text style={styles.sightingSpecies} numberOfLines={1}>
                      {item.preliminary_species || 'Especie desconocida'}
                    </Text>
                    <Text style={styles.sightingDate}>
                      {new Date(item.observed_at).toLocaleDateString('es-VE', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </Text>
                    <View style={styles.sightingStatusPill}>
                      <Text style={styles.sightingStatusText}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </Text>
                    </View>
                  </View>
                  {!isValidated && (
                    <Ionicons name="chevron-forward" size={18} color={C.lightText} />
                  )}
                </CardWrapper>
              );
            }}
          />
        )}
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────
  // SUB-VISTA: Borradores (galería local)
  // ─────────────────────────────────────────────────────────
  if (view === 'drafts') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setView('home')} style={styles.subBackBtn}>
            <Ionicons name="arrow-back" size={22} color={C.earth} />
          </TouchableOpacity>
          <Text style={styles.subTitle}>Borradores</Text>
        </View>

        {drafts.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Aún nada que mostrar aquí...</Text>
          </View>
        ) : (
          <FlatList
            data={drafts}
            keyExtractor={(i) => i.uri}
            numColumns={2}
            contentContainerStyle={styles.draftGrid}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.draftCell}>
                <Image source={{ uri: item.uri }} style={styles.draftImage} resizeMode="cover" />
                <TouchableOpacity
                  style={styles.draftDeleteBtn}
                  onPress={() => deleteDraft(item.uri)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color={C.white} />
                </TouchableOpacity>
                <View style={styles.draftDateBadge}>
                  <Text style={styles.draftDateText}>
                    {new Date(item.timestamp).toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────
  // SUB-VISTA: Editar Perfil
  // ─────────────────────────────────────────────────────────
  if (view === 'edit') {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setView('home')} style={styles.subBackBtn}>
            <Ionicons name="arrow-back" size={22} color={C.earth} />
          </TouchableOpacity>
          <Text style={styles.subTitle}>Editar Perfil</Text>
        </View>

        <ScrollView contentContainerStyle={styles.editContent} showsVerticalScrollIndicator={false}>
          {/* Avatar editable */}
          <TouchableOpacity style={styles.editAvatarWrap} onPress={pickAvatar} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.editAvatarImg} />
            ) : (
              <View style={styles.editAvatarPlaceholder}>
                <Ionicons name="person" size={40} color={C.earth} />
              </View>
            )}
            <View style={styles.editAvatarOverlay}>
              <Ionicons name="camera" size={20} color={C.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.editAvatarHint}>Toca para cambiar la foto</Text>

          {/* Nombre (solo lectura, viene del sistema de auth) */}
          <View style={styles.editFieldGroup}>
            <Text style={styles.editLabel}>Nombre de usuario</Text>
            <View style={styles.editReadonlyField}>
              <Text style={styles.editReadonlyText}>{userName}</Text>
            </View>
            <Text style={styles.editHint}>El nombre se gestiona desde tu cuenta</Text>
          </View>

          {/* Biografía */}
          <View style={styles.editFieldGroup}>
            <Text style={styles.editLabel}>Biografía</Text>
            <TextInput
              style={styles.editBioInput}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Cuéntanos sobre ti..."
              placeholderTextColor={C.lightText}
              multiline
              maxLength={200}
            />
            <Text style={styles.editCharCount}>{editBio.length}/200</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={saveProfile}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={styles.saveBtnText}>Guardar cambios</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─────────────────────────────────────────────────────────
  // VISTA PRINCIPAL: Home del Perfil
  // ─────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Foto de Perfil ── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85} style={styles.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarInner}>
                <Ionicons name="person" size={42} color={C.earth} />
              </View>
            )}
            {/* Ícono de cámara superpuesto */}
            <View style={styles.avatarCameraBtn}>
              <Ionicons name="camera" size={14} color={C.white} />
            </View>
          </TouchableOpacity>
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

        <View style={styles.divider} />

        {/* ── Opciones del Menú ── */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => goTo('sightings')}>
            <MaterialCommunityIcons name="binoculars" size={24} color={C.sage} />
            <Text style={styles.menuLabel}>Mis Avistamientos</Text>
            <Ionicons name="chevron-forward" size={18} color={C.lightText} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => goTo('projects')}>
            <Ionicons name="folder-outline" size={24} color={C.sage} />
            <Text style={styles.menuLabel}>Mis Proyectos</Text>
            <Ionicons name="chevron-forward" size={18} color={C.lightText} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => goTo('drafts')}>
            <Ionicons name="document-text-outline" size={24} color={C.sage} />
            <Text style={styles.menuLabel}>Borradores</Text>
            <Ionicons name="chevron-forward" size={18} color={C.lightText} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => goTo('edit')}>
            <Ionicons name="create-outline" size={24} color={C.sage} />
            <Text style={styles.menuLabel}>Editar Perfil</Text>
            <Ionicons name="chevron-forward" size={18} color={C.lightText} />
          </TouchableOpacity>
        </View>

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
          <Ionicons name="log-out-outline" size={24} color={C.red} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const AVATAR_SIZE = 90;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.drawerBg,
    paddingHorizontal: 24,
  },
  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // ── Sub-vista Header ──────────────────────────────────
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
    marginBottom: 16,
  },
  subBackBtn: { padding: 4 },
  subTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: C.earth,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.lightText,
    fontStyle: 'italic',
  },
  listContent: { paddingBottom: 40, gap: 12 },

  // ── Mis Avistamientos ─────────────────────────────────
  sightingCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  sightingThumb: {
    width: 80,
    height: 80,
    backgroundColor: C.border,
  },
  sightingInfo: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  sightingSpecies: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.forest,
  },
  sightingDate: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.lightText,
  },
  sightingStatusPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(158,179,109,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  sightingStatusText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: C.sage,
  },

  // ── Tarjeta de Proyecto ─────────────────────────────
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  projectIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(158,179,109,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectInfo: { flex: 1, gap: 4 },
  projectTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: C.forest,
  },
  projectStatus: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.sage,
  },

  // ── Borradores ────────────────────────────────────────
  draftGrid: { paddingBottom: 40, gap: 8 },
  draftCell: {
    flex: 1,
    margin: 4,
    borderRadius: 14,
    overflow: 'hidden',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: C.border,
  },
  draftImage: {
    width: '100%',
    height: '100%',
  },
  draftDeleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(229,115,115,0.85)',
    borderRadius: 20,
    padding: 6,
  },
  draftDateBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  draftDateText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: C.white,
  },

  // ── Editar Perfil ─────────────────────────────────────
  editContent: { paddingBottom: 60, gap: 24 },
  editAvatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  editAvatarImg: { width: '100%', height: '100%' },
  editAvatarPlaceholder: {
    flex: 1,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarHint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: C.lightText,
    textAlign: 'center',
    marginTop: -12,
  },
  editFieldGroup: { gap: 6 },
  editLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: C.earth,
  },
  editReadonlyField: {
    backgroundColor: 'rgba(74,63,53,0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  editReadonlyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: C.lightText,
  },
  editHint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: C.lightText,
    fontStyle: 'italic',
  },
  editBioInput: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    padding: 14,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.earth,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: C.border,
  },
  editCharCount: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: C.lightText,
    alignSelf: 'flex-end',
  },
  saveBtn: {
    backgroundColor: C.earth,
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: C.white,
  },

  // ── Home principal ────────────────────────────────────
  avatarSection: {
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: C.sage,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarInner: {
    flex: 1,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCameraBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: C.sage,
    borderRadius: 12,
    padding: 5,
  },
  infoSection: { marginBottom: 28 },
  greeting: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: C.lightText,
    marginBottom: 2,
  },
  userName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 26,
    color: C.forest,
    lineHeight: 32,
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(158,179,109,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  roleText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: C.sage,
  },
  bio: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    // ── Color marrón (no blanco) ──
    color: C.earth,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: C.divider,
    marginVertical: 8,
  },
  menuSection: { paddingVertical: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  menuLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: C.earth,
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  logoutText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: C.red,
  },
});
