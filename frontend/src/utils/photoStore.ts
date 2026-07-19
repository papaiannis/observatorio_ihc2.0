/**
 * photoStore.ts
 * Almacenamiento persistente de fotos tomadas por el usuario.
 * Usa AsyncStorage en nativo y localStorage en web.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'observatorio_photos';

export interface StoredPhoto {
  uri: string;
  timestamp: number;
}

async function readAll(): Promise<StoredPhoto[]> {
  try {
    const raw = Platform.OS === 'web'
      ? localStorage.getItem(KEY)
      : await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeAll(photos: StoredPhoto[]): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(KEY, JSON.stringify(photos));
    } else {
      await AsyncStorage.setItem(KEY, JSON.stringify(photos));
    }
  } catch {}
}

const getAll = (): Promise<StoredPhoto[]> => readAll();

const addPhoto = async (uri: string): Promise<StoredPhoto[]> => {
  const existing = await readAll();
  const updated = [{ uri, timestamp: Date.now() }, ...existing];
  await writeAll(updated);
  return updated;
};

const removePhoto = async (uri: string): Promise<StoredPhoto[]> => {
  const existing = await readAll();
  const updated = existing.filter((p) => p.uri !== uri);
  await writeAll(updated);
  return updated;
};

export const photoStore = { getAll, addPhoto, removePhoto };
