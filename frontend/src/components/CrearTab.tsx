import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  FlatList,
  Platform,
  Alert,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { photoStore, StoredPhoto } from '../utils/photoStore';
import SightingFormScreen from './SightingFormScreen';

const { width, height } = Dimensions.get('window');
const THUMB_SIZE = (width - 4) / 3; // 3 columnas con gaps mínimos

const C = {
  bg: '#F6F6F6',
  forest: '#1E2A21',
  sage: '#9EB36D',
  earth: '#4A3F35',
  white: '#FFFFFF',
  gray: '#A09D9A',
  overlay: 'rgba(0,0,0,0.45)',
  gridCell: '#D8D8D8',
  border: '#C8C8C8',
};

type ViewMode = 'camera' | 'gallery' | 'form';

interface CrearTabProps {
  onClose?: () => void;
  openGallery?: boolean;
  onGalleryOpened?: () => void;
}

export default function CrearTab({ onClose, openGallery, onGalleryOpened }: CrearTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('camera');
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'on' | 'off'>('off');
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<StoredPhoto | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Animaciones
  const shutterAnim = useRef(new Animated.Value(0)).current;
  const galleryAnim = useRef(new Animated.Value(width)).current;
  const formAnim = useRef(new Animated.Value(width)).current;

  // Estados de montaje para mantener transiciones visuales limpias
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Cargar fotos guardadas al montar el componente
  useEffect(() => {
    photoStore.getAll().then(setPhotos);
  }, []);

  // Abrir galería automáticamente si lo pide el perfil
  useEffect(() => {
    if (openGallery) {
      setViewMode('gallery');
      onGalleryOpened?.();
    }
  }, [openGallery]);

  // Manejar animaciones de transición según el modo de vista
  useEffect(() => {
    if (viewMode === 'camera') {
      Animated.timing(galleryAnim, {
        toValue: width,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setIsGalleryVisible(false));

      Animated.timing(formAnim, {
        toValue: width,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setIsFormVisible(false));
    } else if (viewMode === 'gallery') {
      setIsGalleryVisible(true);
      Animated.spring(galleryAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

      Animated.timing(formAnim, {
        toValue: width,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setIsFormVisible(false));
    } else if (viewMode === 'form') {
      setIsFormVisible(true);
      Animated.spring(formAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [viewMode]);

  // Animación de obturador (flash blanco breve)
  const triggerShutter = () => {
    shutterAnim.setValue(1);
    Animated.timing(shutterAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      triggerShutter(); // feedback inmediato
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        const updated = await photoStore.addPhoto(photo.uri);
        setPhotos(updated);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo tomar la foto. Intenta de nuevo.');
    }
  }, []);

  // Importar una o varias fotos desde la galería del teléfono
  const handleImport = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para importar fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;

    let updated: StoredPhoto[] = [];
    for (const asset of result.assets) {
      updated = await photoStore.addPhoto(asset.uri);
    }
    setPhotos(updated);
    setViewMode('gallery');
  }, []);

  const handleDeletePhoto = (uri: string) => {
    Alert.alert('Eliminar foto', '¿Deseas eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const updated = await photoStore.removePhoto(uri);
          setPhotos(updated);
        },
      },
    ]);
  };

  const toggleFlash = () => setFlash((f) => (f === 'off' ? 'on' : 'off'));
  const toggleFacing = () => setFacing((f) => (f === 'back' ? 'front' : 'back'));

  // ── Renderizado: Vista de Galería "Por subir" ────────────────
  const renderGalleryView = () => {
    return (
      <SafeAreaView style={styles.galleryContainer}>
        <View style={styles.galleryHeaderRow}>
          <TouchableOpacity
            onPress={() => setViewMode('camera')}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={C.earth} />
          </TouchableOpacity>
          <Text style={styles.galleryTitle}>Por subir</Text>
          <View style={styles.backBtn} />
        </View>

        {photos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aún nada que mostrar aquí...</Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            keyExtractor={(item) => item.uri}
            numColumns={3}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.gridCell}
                activeOpacity={0.75}
                onPress={() => {
                  setSelectedPhoto(item);
                  setViewMode('form');
                }}
                onLongPress={() => handleDeletePhoto(item.uri)}
              >
                <Image
                  source={{ uri: item.uri }}
                  style={styles.gridImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    );
  };

  // ── Renderizado: Vista de Formulario ─────────────────────────
  const renderFormView = () => {
    if (!selectedPhoto) return null;
    return (
      <SightingFormScreen
        photoUri={selectedPhoto.uri}
        photoTimestamp={selectedPhoto.timestamp}
        onBack={() => setViewMode('gallery')}
        onPublished={async () => {
          // Eliminar la foto de la galería local tras publicar
          const updated = await photoStore.removePhoto(selectedPhoto.uri);
          setPhotos(updated);
          setSelectedPhoto(null);
          setViewMode('camera');
        }}
      />
    );
  };

  // ── Renderizado: Permisos de Cámara ──────────────────────────
  if (!permission) {
    return <View style={styles.mainContainer} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={C.sage} />
        <Text style={styles.permissionText}>
          Necesitamos acceso a la cámara para capturar tus avistamientos.
        </Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
          activeOpacity={0.85}
        >
          <Text style={styles.permissionBtnText}>Permitir acceso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lastPhoto = photos[0];

  return (
    <View style={styles.mainContainer}>
      {/* ── CAPA 1: CÁMARA (BASE) ── */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing={facing}
          flash={flash}
        />

        {/* Flash de obturador */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: '#fff', opacity: shutterAnim, zIndex: 20, pointerEvents: 'none' },
          ]}
        />

        {/* Barra superior de cámara */}
        <View style={styles.cameraTopBar}>
          <View style={styles.topBarColLeft}>
            <TouchableOpacity onPress={onClose} style={styles.camCtrlBtn} activeOpacity={0.8}>
              <Ionicons name="close" size={28} color={C.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.topBarCol}>
            <TouchableOpacity onPress={toggleFlash} style={styles.camCtrlBtn} activeOpacity={0.8}>
              <Ionicons
                name={flash === 'on' ? 'flash' : 'flash-off'}
                size={26}
                color={C.white}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.topBarColRight}>
            <TouchableOpacity onPress={toggleFacing} style={styles.camCtrlBtn} activeOpacity={0.8}>
              <MaterialIcons name="flip-camera-ios" size={28} color={C.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barra inferior de cámara */}
        <View style={styles.cameraBottomBar}>
          <TouchableOpacity
            style={styles.thumbnailWrapper}
            activeOpacity={0.8}
            onPress={() => setViewMode('gallery')}
          >
            {lastPhoto ? (
              <Image
                source={{ uri: lastPhoto.uri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailEmpty]}>
                <Ionicons name="images-outline" size={20} color={C.gray} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureOuter}
            activeOpacity={0.85}
            onPress={handleCapture}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.thumbnailWrapper}
            activeOpacity={0.8}
            onPress={handleImport}
          >
            <View style={[styles.thumbnail, styles.thumbnailEmpty]}>
              <Ionicons name="images" size={24} color={C.white} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── CAPA 2: GALERÍA (DESLIZA LATERALMENTE DESDE DERECHA) ── */}
      {isGalleryVisible && (
        <Animated.View
          style={[
            styles.animatedContainer,
            { transform: [{ translateX: galleryAnim }] },
          ]}
        >
          {renderGalleryView()}
        </Animated.View>
      )}

      {/* ── CAPA 3: FORMULARIO (DESLIZA LATERALMENTE DESDE DERECHA) ── */}
      {isFormVisible && (
        <Animated.View
          style={[
            styles.animatedContainer,
            { transform: [{ translateX: formAnim }] },
          ]}
        >
          {renderFormView()}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  animatedContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.bg,
    zIndex: 100,
  },

  // ── Cámara ─────────────────────────────────────────────
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  cameraTopBar: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topBarCol: {
    flex: 1,
    alignItems: 'center',
  },
  topBarColLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  topBarColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  camCtrlBtn: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 30,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    zIndex: 10,
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: C.white,
  },
  thumbnailEmpty: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.white,
  },

  // ── Permiso ────────────────────────────────────────────
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 120,
    gap: 20,
    backgroundColor: C.bg,
  },
  permissionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: C.earth,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: C.forest,
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 8,
  },
  permissionBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: C.white,
  },

  // ── Galería ─────────────────────────────────────────────
  galleryContainer: {
    flex: 1,
    backgroundColor: C.white,
  },
  galleryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: C.earth,
  },
  gridContent: {
    paddingBottom: 120,
  },
  gridCell: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderWidth: 1,
    borderColor: C.white,
    backgroundColor: C.gridCell,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 120,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: C.gray,
    fontStyle: 'italic',
  },
});
