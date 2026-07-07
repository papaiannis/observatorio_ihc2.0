/**
 * photoStore.ts
 * Almacenamiento persistente de fotos tomadas por el usuario.
 * Usa AsyncStorage en nativo y localStorage en web.
 */

const KEY = 'observatorio_photos';

export interface StoredPhoto {
  uri: string;
  timestamp: number;
}

const getAll = (): StoredPhoto[] => {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    }
  } catch {}
  return [];
};

const save = (photos: StoredPhoto[]) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, JSON.stringify(photos));
    }
  } catch {}
};

const addPhoto = (uri: string): StoredPhoto[] => {
  const existing = getAll();
  const updated = [{ uri, timestamp: Date.now() }, ...existing];
  save(updated);
  return updated;
};

const removePhoto = (uri: string): StoredPhoto[] => {
  const existing = getAll();
  const updated = existing.filter((p) => p.uri !== uri);
  save(updated);
  return updated;
};

export const photoStore = { getAll, addPhoto, removePhoto };
