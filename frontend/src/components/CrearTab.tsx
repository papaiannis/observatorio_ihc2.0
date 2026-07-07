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
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { photoStore, StoredPhoto } from '../utils/photoStore';

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

type ViewMode = 'camera' | 'gallery';

interface CrearTabProps {
  onClose?: () => void;
}

export default function CrearTab({ onClose }: CrearTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('camera');
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'on' | 'off'>('off');
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Cargar fotos guardadas al montar el componente
  useEffect(() => {
    setPhotos(photoStore.getAll());
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        const updated = photoStore.addPhoto(photo.uri);
        setPhotos(updated);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo tomar la foto. Intenta de nuevo.');
    }
  }, []);

  const handleDeletePhoto = (uri: string) => {
    Alert.alert('Eliminar foto', '¿Deseas eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          const updated = photoStore.removePhoto(uri);
          setPhotos(updated);
        },
      },
    ]);
  };

  const toggleFlash = () => setFlash((f) => (f === 'off' ? 'on' : 'off'));
  const toggleFacing = () => setFacing((f) => (f === 'back' ? 'front' : 'back'));

  // ── Vista de Galería "Por subir" ──────────────────────────
  if (viewMode === 'gallery') {
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
  }

  // ── Vista de Cámara ───────────────────────────────────────
  if (!permission) {
    return <View style={styles.cameraContainer} />;
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
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        flash={flash}
      />

      {/* ── Barra superior: controles dentro del visor ── */}
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

      {/* ── Barra inferior: thumbnail + botón captura ── */}
      <View style={styles.cameraBottomBar}>
        {/* Thumbnail de la última foto tomada */}
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

        {/* Botón de captura */}
        <TouchableOpacity
          style={styles.captureOuter}
          activeOpacity={0.85}
          onPress={handleCapture}
        >
          <View style={styles.captureInner} />
        </TouchableOpacity>

        {/* Espaciado simétrico */}
        <View style={styles.thumbnailWrapper} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Cámara ─────────────────────────────────────────────
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  cameraTopBar: {
    position: 'absolute',
    top: 48, // Ajustado para librar la muesca de los dispositivos iOS
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
    bottom: 40, // Se baja a 40px porque ya no está la barra de footer estorbando
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
