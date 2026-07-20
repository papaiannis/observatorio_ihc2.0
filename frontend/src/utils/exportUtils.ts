import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://ihcobservatorio2-202625.onrender.com';

export async function downloadAndShareExport(
  endpointPath: string,
  filenameBase: string,
  format: 'csv' | 'xlsx',
  token?: string
): Promise<void> {
  try {
    const isXlsx = format === 'xlsx';
    const ext = isXlsx ? 'xlsx' : 'csv';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${filenameBase}_${timestamp}.${ext}`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    const url = endpointPath.startsWith('http') ? endpointPath : `${API_URL}${endpointPath}`;

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const downloadRes = await FileSystem.downloadAsync(url, fileUri, {
      headers,
    });

    if (downloadRes.status !== 200) {
      throw new Error(`Error al descargar el archivo (Código HTTP ${downloadRes.status})`);
    }

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(downloadRes.uri, {
        mimeType: isXlsx
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv',
        dialogTitle: `Exportar ${filename}`,
        UTI: isXlsx ? 'com.microsoft.excel.xlsx' : 'public.comma-separated-values-text',
      });
    } else {
      Alert.alert('Dataset Guardado', `El archivo se descargó correctamente en: ${downloadRes.uri}`);
    }
  } catch (error: any) {
    console.warn('Error en exportación de datos:', error);
    Alert.alert('Error en Exportación', error?.message || 'No se pudo generar y descargar el archivo.');
    throw error;
  }
}
