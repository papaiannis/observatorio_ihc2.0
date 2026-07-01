import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function AddScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const cameraRef = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Al entrar a la pantalla, si el permiso aún no se ha decidido, lo pedimos.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
      }
    } catch (error) {
      console.warn('Error al tomar la foto:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => setPhotoUri(null);

  // 1. Permisos todavía cargando
  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Cargando cámara…</Text>
      </View>
    );
  }

  // 2. Permiso denegado: mostramos botón para reintentar
  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-outline" size={56} color="#3A4522" style={styles.deniedIcon} />
        <Text style={styles.title}>Cámara desactivada</Text>
        <Text style={styles.message}>
          Necesitamos acceso a la cámara para escanear especies.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Permitir cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Vista previa de la foto tomada
  if (photoUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        <View style={[styles.previewControls, { bottom: insets.bottom + 24 }]}>
          <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
            <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
            <Text style={styles.retakeText}>Repetir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 4. Cámara activa con botón de captura (iOS + Android).
  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={[styles.shutterContainer, { bottom: insets.bottom + 24 }]}>
            <TouchableOpacity
              style={styles.shutterButton}
              onPress={handleTakePhoto}
              disabled={isCapturing}
              activeOpacity={0.7}
            >
              {isCapturing ? (
                <ActivityIndicator color="#3A4522" />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  preview: {
    flex: 1,
  },
  // --- Botón de captura ---
  shutterContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterButton: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  // --- Controles de la vista previa ---
  previewControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  retakeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // --- Estados de permiso ---
  centered: {
    flex: 1,
    backgroundColor: '#F4F7EE',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  deniedIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#3182ce',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
