import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
  id: string;
  email: string;
  nombre?: string;
  username?: string;
  role?: string;
  avatar_url?: string;
  bio?: string;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY  = 'auth_user';

let inMemoryToken: string | null = null;
let inMemoryUser: UserProfile | null = null;

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

export const authStore = {
  async setSession(token: string, user: UserProfile) {
    inMemoryToken = token;
    inMemoryUser  = user;
    await persist(token, user);
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
    }
  },

  async clearSession() {
    inMemoryToken = null;
    inMemoryUser  = null;
    await clearPersisted();
  },
};
