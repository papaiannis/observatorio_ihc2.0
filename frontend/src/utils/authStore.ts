import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Tipos exportados ──────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  nombre?: string;
  username?: string;
  /** Valores posibles: 'entusiasta' | 'especialista' | 'administrador' */
  role?: string;
  avatar_url?: string;
  bio?: string;
}

export interface SessionState {
  token: string | null;
  user: UserProfile | null;
  /** true mientras se lee el almacenamiento por primera vez */
  loading: boolean;
}

// ── Claves de almacenamiento ──────────────────────────────────────────────────
const TOKEN_KEY = 'auth_token';
const USER_KEY  = 'auth_user';

// ── Estado singleton en memoria ───────────────────────────────────────────────
let inMemoryToken: string | null = null;
let inMemoryUser: UserProfile | null = null;

/**
 * Suscriptores reactivos: componentes que usan `useSession()` recibirán
 * actualizaciones cuando la sesión cambie sin necesidad de re-montar.
 */
let listeners: Array<(state: SessionState) => void> = [];

function notifyListeners(state: SessionState) {
  listeners.forEach((fn) => fn(state));
}

// ── Persistencia ──────────────────────────────────────────────────────────────
async function persist(token: string, user: UserProfile) {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
  } else {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
  }
}

async function readPersisted(): Promise<{ token: string | null; user: UserProfile | null }> {
  if (Platform.OS === 'web') {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const raw   = localStorage.getItem(USER_KEY);
      if (token && raw) return { token, user: JSON.parse(raw) };
    } catch {}
  } else {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const raw   = await AsyncStorage.getItem(USER_KEY);
      if (token && raw) return { token, user: JSON.parse(raw) };
    } catch {}
  }
  return { token: null, user: null };
}

async function clearPersisted() {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
  } else {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    } catch {}
  }
}

// ── Store principal ───────────────────────────────────────────────────────────
export const authStore = {
  async setSession(token: string, user: UserProfile) {
    inMemoryToken = token;
    inMemoryUser  = user;
    await persist(token, user);
    notifyListeners({ token, user, loading: false });
  },

  async getSession(): Promise<{ token: string | null; user: UserProfile | null }> {
    if (inMemoryToken && inMemoryUser) {
      return { token: inMemoryToken, user: inMemoryUser };
    }
    const { token, user } = await readPersisted();
    if (token && user) {
      inMemoryToken = token;
      inMemoryUser  = user;
    }
    return { token, user };
  },

  async updateUser(patch: Partial<UserProfile>) {
    const { token } = await this.getSession();
    if (inMemoryUser) {
      inMemoryUser = { ...inMemoryUser, ...patch };
      if (token) await persist(token, inMemoryUser);
      notifyListeners({ token, user: inMemoryUser, loading: false });
    }
  },

  /**
   * Limpia la sesión completamente: memoria + almacenamiento persistente.
   * SIEMPRE llama esto desde los botones de Cerrar Sesión.
   */
  async clearSession() {
    inMemoryToken = null;
    inMemoryUser  = null;
    await clearPersisted();
    notifyListeners({ token: null, user: null, loading: false });
  },

  _subscribe(fn: (state: SessionState) => void) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },
};

// ── Hook reactivo ─────────────────────────────────────────────────────────────
/**
 * Hook que expone el estado de la sesión de forma reactiva.
 * Se actualiza automáticamente cuando se llama a `setSession` o `clearSession`.
 *
 * @example
 * const { user, token, loading } = useSession();
 * const isGuest = !user;
 * const isEspecialista = user?.role?.toLowerCase() === 'especialista';
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    token: null,
    user: null,
    loading: true,
  });

  useEffect(() => {
    // Carga inicial desde almacenamiento
    authStore.getSession().then(({ token, user }) => {
      setState({ token, user, loading: false });
    });

    // Suscribirse a cambios futuros (login / logout)
    const unsub = authStore._subscribe((s) => setState(s));
    return unsub;
  }, []);

  return state;
}
