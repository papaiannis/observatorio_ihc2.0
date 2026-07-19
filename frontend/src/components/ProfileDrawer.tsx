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
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihcobservatorio2-202625.onrender.com';

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

type DrawerView = 'home' | 'sightings' | 'drafts' | 'edit' | 'projects' | 'create_project';

interface ProfileDrawerProps {
  onClose: () => void;
  onNavigate?: (
    target: 'sightings' | 'drafts' | 'tracking' | 'project' | 'curaduria',
    data?: any,
  ) => void;
  /** true si el usuario no tiene sesión */
  isGuest?: boolean;
  /** rol del usuario (normalizado a lowercase) */
  userRole?: string;
}

interface Sighting {
  id: string;
  photo_url: string;
  preliminary_species?: string;
  status: string;
  observed_at: string;
  species?: { scientific_name: string; common_name?: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En espera',
  validated: 'Validado',
  rejected: 'Rechazado',
  in_review: 'En revisión',
};

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case 'validated':
      return { bg: '#E8F5E9', text: '#4CAF50' };
    case 'rejected':
      return { bg: '#FFEBEE', text: '#E53935' };
    case 'in_review':
      return { bg: '#E8EAF6', text: '#3F51B5' };
    default:
      return { bg: '#FFF8DB', text: '#E6B800' };
  }
};

export default function ProfileDrawer({ onClose, onNavigate, isGuest = false, userRole: userRoleProp }: ProfileDrawerProps) {
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
        // Prioriza el rol que viene como prop (ya normalizado) sobre el del storage
        const roleFromSession = user.role?.toLowerCase() ?? 'entusiasta';
        setUserRole(userRoleProp ?? roleFromSession);
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
  const [createdProjects, setCreatedProjects] = useState<any[]>([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectToolsUrl, setProjectToolsUrl] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

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

      if (userRole.toLowerCase() === 'especialista') {
        const resMy = await fetch(`${API_URL}/api/v1/investigations/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resMy.ok) {
          const data = await resMy.json();
          setCreatedProjects(data.investigations || data || []);
        }
      }
    } catch {}
    setLoadingProjects(false);
  }, [token, userRole]);

  // ── Crear nuevo proyecto (Especialista) ──────────────────
  const handleCreateProject = async () => {
    if (!projectTitle.trim() || !projectDescription.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa el nombre del proyecto y las metas.');
      return;
    }
    setCreatingProject(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const res = await fetch(`${API_URL}/api/v1/investigations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: projectTitle.trim(),
          description: projectDescription.trim(),
          tools_url: projectToolsUrl.trim() || undefined,
          start_date: today,
          end_date: nextYear,
          status: 'active',
        }),
      });

      if (res.ok) {
        Alert.alert('¡Proyecto Creado!', 'Tu proyecto científico ha sido creado con éxito.');
        setProjectTitle('');
        setProjectDescription('');
        setProjectToolsUrl('');
        setView('home');
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', err.message || 'No se pudo crear el proyecto.');
      }
    } catch {
      Alert.alert('Error', 'Error de red.');
    } finally {
      setCreatingProject(false);
    }
  };


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
          {userRole.toLowerCase() === 'especialista' && (
            <TouchableOpacity
              onPress={() => setView('create_project')}
              style={styles.createProjectBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.createProjectBtnText}>Crear</Text>
            </TouchableOpacity>
          )}
        </View>

        {loadingProjects ? (
          <View style={styles.centered}>
            <ActivityIndicator color={C.sage} size="large" />
          </View>
        ) : projects.length === 0 && createdProjects.length === 0 ? (
          <View style={styles.centered}>
            {userRole.toLowerCase() === 'especialista' ? (
              <>
                <Ionicons name="flask-outline" size={48} color={C.lightText} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>Aún no has creado ningún proyecto</Text>
                <TouchableOpacity
                  style={styles.emptyCreateBtn}
                  onPress={() => setView('create_project')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#7B5EA7" />
                  <Text style={styles.emptyCreateBtnText}>Crear mi primer proyecto</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.emptyText}>No participas en ningún proyecto aún</Text>
            )}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {createdProjects.length > 0 && (
              <>
                <Text style={styles.sectionHeader}>PROYECTOS CREADOS (MI AUTORÍA)</Text>
                {createdProjects.map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.projectCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      onClose();
                      onNavigate?.('project', item);
                    }}
                  >
                    <View style={styles.projectIconWrap}>
                      <Ionicons name="shield-checkmark" size={22} color={C.sage} />
                    </View>
                    <View style={styles.projectInfo}>
                      <Text style={styles.projectTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.projectStatus}>
                        {item.status === 'active' ? '● Activo' : '○ Inactivo'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={C.lightText} />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {projects.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, createdProjects.length > 0 && { marginTop: 24 }]}>
                  PROYECTOS EN LOS QUE PARTICIPO
                </Text>
                {projects.map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.projectCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      onClose();
                      onNavigate?.('project', item);
                    }}
                  >
                    <View style={styles.projectIconWrap}>
                      <Ionicons name="leaf-outline" size={22} color={C.sage} />
                    </View>
                    <View style={styles.projectInfo}>
                      <Text style={styles.projectTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.projectStatus}>
                        {item.status === 'active' ? '● Activo' : '○ Inactivo'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={C.lightText} />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
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
              const badge = getStatusBadgeStyle(item.status);
              const speciesLabel = item.species?.scientific_name || item.species?.common_name || item.preliminary_species || 'Especie por identificar';
              return (
                <TouchableOpacity
                  style={styles.sightingCard}
                  activeOpacity={0.75}
                  onPress={() => {
                    onClose();
                    onNavigate?.('tracking', item);
                  }}
                >
                  <Image source={{ uri: item.photo_url }} style={styles.sightingThumb} resizeMode="cover" />
                  <View style={styles.sightingInfo}>
                    <Text style={styles.sightingSpecies} numberOfLines={1}>
                      {speciesLabel}
                    </Text>
                    <Text style={styles.sightingDate}>
                      {new Date(item.observed_at).toLocaleDateString('es-VE', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </Text>
                    <View style={[styles.sightingStatusPill, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.sightingStatusText, { color: badge.text }]}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.lightText} />
                </TouchableOpacity>
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
  // SUB-VISTA: Crear Proyecto (Especialista)
  // ─────────────────────────────────────────────────────────
  if (view === 'create_project') {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setView('home')} style={styles.subBackBtn}>
            <Ionicons name="arrow-back" size={22} color={C.earth} />
          </TouchableOpacity>
          <Text style={styles.subTitle}>Crear Proyecto</Text>
        </View>

        <ScrollView contentContainerStyle={styles.editContent} showsVerticalScrollIndicator={false}>
          <View style={styles.editFieldGroup}>
            <Text style={styles.editLabel}>Nombre del Proyecto</Text>
            <TextInput
              style={styles.editBioInput}
              value={projectTitle}
              onChangeText={setProjectTitle}
              placeholder="Ej. Estudio de Orquídeas de Guayana..."
              placeholderTextColor={C.lightText}
              maxLength={100}
            />
          </View>

          <View style={styles.editFieldGroup}>
            <Text style={styles.editLabel}>Metas / Descripción</Text>
            <TextInput
              style={[styles.editBioInput, { minHeight: 120 }]}
              value={projectDescription}
              onChangeText={setProjectDescription}
              placeholder="Describe las metas de conservación y observación de este proyecto científico..."
              placeholderTextColor={C.lightText}
              multiline
              maxLength={500}
            />
          </View>

          <View style={styles.editFieldGroup}>
            <Text style={styles.editLabel}>Enlace a Google Forms (Opcional)</Text>
            <TextInput
              style={styles.editBioInput}
              value={projectToolsUrl}
              onChangeText={setProjectToolsUrl}
              placeholder="https://docs.google.com/forms/d/..."
              placeholderTextColor={C.lightText}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, creatingProject && { opacity: 0.6 }]}
            onPress={handleCreateProject}
            activeOpacity={0.85}
            disabled={creatingProject}
          >
            {creatingProject ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={styles.saveBtnText}>Crear Proyecto</Text>
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
          <TouchableOpacity
            onPress={(!isGuest && token) ? pickAvatar : undefined}
            activeOpacity={(!isGuest && token) ? 0.85 : 1}
            style={styles.avatarWrap}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarInner}>
                <Ionicons name="person" size={42} color={C.earth} />
              </View>
            )}
            {/* Ícono de cámara superpuesto solo si tiene sesión */}
            {(!isGuest && token) && (
              <View style={styles.avatarCameraBtn}>
                <Ionicons name="camera" size={14} color={C.white} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Nombre y Bio ── */}
        <View style={styles.infoSection}>
          <Text style={styles.greeting}>{(!isGuest && token) ? 'Bienvenido,' : 'Modo Explorador'}</Text>
          <Text style={styles.userName}>{(!isGuest && token) ? userName : 'Invitado'}</Text>

          {(!isGuest && token) ? (
            <>
              {/* Badge de rol — visual distinto para cada tipo */}
              {userRole.toLowerCase() === 'especialista' ? (
                <View style={[styles.roleBadge, styles.roleBadgeEspecialista]}>
                  <Ionicons name="star" size={11} color="#FFFFFF" style={{ marginRight: 5 }} />
                  <Text style={[styles.roleText, styles.roleTextEspecialista]}>Especialista</Text>
                </View>
              ) : (
                <View style={[styles.roleBadge, styles.roleBadgeEntusiasta]}>
                  <Ionicons name="leaf" size={11} color="#FFFFFF" style={{ marginRight: 5 }} />
                  <Text style={[styles.roleText, styles.roleTextEntusiasta]}>Entusiasta</Text>
                </View>
              )}
              <Text style={styles.bio}>{userBio}</Text>
            </>
          ) : (
            <Text style={styles.bio}>Inicia sesión para subir avistamientos, participar en proyectos y realizar seguimiento.</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* ── Opciones Generales ── */}
        <View style={styles.menuSection}>
          {(!isGuest && token) && (
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => goTo('sightings')}>
              <MaterialCommunityIcons name="binoculars" size={24} color={C.sage} />
              <Text style={styles.menuLabel}>Mis Avistamientos</Text>
              <Ionicons name="chevron-forward" size={18} color={C.lightText} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => goTo('drafts')}>
            <Ionicons name="document-text-outline" size={24} color={C.sage} />
            <Text style={styles.menuLabel}>Borradores</Text>
            <Ionicons name="chevron-forward" size={18} color={C.lightText} />
          </TouchableOpacity>

          {(!isGuest && token) && (
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => goTo('edit')}>
              <Ionicons name="create-outline" size={24} color={C.sage} />
              <Text style={styles.menuLabel}>Editar Perfil</Text>
              <Ionicons name="chevron-forward" size={18} color={C.lightText} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Opciones de Especialista ── */}
        {(!isGuest && token && userRole.toLowerCase() === 'especialista') && (
          <>
            <View style={styles.divider} />
            <View style={styles.roleSectionHeader}>
              <Ionicons name="star" size={13} color="#7B5EA7" />
              <Text style={styles.roleSectionTitle}>Opciones de Especialista</Text>
            </View>
            <View style={styles.menuSection}>
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => {
                  onClose();
                  onNavigate?.('curaduria');
                }}
              >
                <Ionicons name="shield-checkmark-outline" size={24} color="#7B5EA7" />
                <Text style={[styles.menuLabel, styles.menuLabelEspecialista]}>Panel de Curaduría</Text>
                <Ionicons name="chevron-forward" size={18} color={C.lightText} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => goTo('projects')}>
                <Ionicons name="flask-outline" size={24} color="#7B5EA7" />
                <Text style={[styles.menuLabel, styles.menuLabelEspecialista]}>Mis Proyectos</Text>
                <Ionicons name="chevron-forward" size={18} color={C.lightText} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => goTo('create_project')}>
                <Ionicons name="add-circle-outline" size={24} color="#7B5EA7" />
                <Text style={[styles.menuLabel, styles.menuLabelEspecialista]}>Crear Proyecto</Text>
                <Ionicons name="chevron-forward" size={18} color={C.lightText} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Opciones de Entusiasta ── */}
        {(!isGuest && token && userRole.toLowerCase() !== 'especialista') && (
          <>
            <View style={styles.divider} />
            <View style={styles.roleSectionHeader}>
              <Ionicons name="leaf" size={13} color="#3A9E6D" />
              <Text style={[styles.roleSectionTitle, { color: '#3A9E6D' }]}>Opciones de Entusiasta</Text>
            </View>
            <View style={styles.menuSection}>
              <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => goTo('projects')}>
                <Ionicons name="folder-outline" size={24} color="#3A9E6D" />
                <Text style={[styles.menuLabel, styles.menuLabelEntusiasta]}>Proyectos que Sigo</Text>
                <Ionicons name="chevron-forward" size={18} color={C.lightText} />
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.divider} />

        {/* ── Cerrar Sesión / Iniciar Sesión ── */}
        {(!isGuest && token) ? (
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.7}
            onPress={async () => {
              await authStore.clearSession();
              onClose();
              import('expo-router').then(({ router }) => {
                router.replace('/login');
              });
            }}
          >
            <Ionicons name="log-out-outline" size={22} color={C.red} />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              import('expo-router').then(({ router }) => {
                router.replace('/login');
              });
            }}
          >
            <Ionicons name="log-in-outline" size={22} color={C.sage} />
            <Text style={[styles.logoutText, { color: C.sage }]}>Iniciar Sesión</Text>
          </TouchableOpacity>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  roleBadgeEspecialista: {
    backgroundColor: '#7B5EA7',
  },
  roleBadgeEntusiasta: {
    backgroundColor: '#3A9E6D',
  },
  roleText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  roleTextEspecialista: {
    color: '#FFFFFF',
  },
  roleTextEntusiasta: {
    color: '#FFFFFF',
  },
  roleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
    paddingTop: 4,
    paddingBottom: 2,
    marginBottom: 4,
  },
  roleSectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#7B5EA7',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  menuLabelEspecialista: {
    color: '#7B5EA7',
  },
  menuLabelEntusiasta: {
    color: '#3A9E6D',
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
  sectionHeader: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: C.lightText,
    letterSpacing: 1,
    marginBottom: 10,
  },
  createProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7B5EA7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  createProjectBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#7B5EA7',
  },
  emptyCreateBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#7B5EA7',
  },
});
