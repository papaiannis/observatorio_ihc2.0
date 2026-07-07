import { Platform } from 'react-native';

interface UserProfile {
  id: string;
  email: string;
  nombre?: string;
  username?: string;
  role?: string;
  avatar_url?: string;
}

let inMemoryToken: string | null = null;
let inMemoryUser: UserProfile | null = null;

export const authStore = {
  async setSession(token: string, user: UserProfile) {
    inMemoryToken = token;
    inMemoryUser = user;

    if (Platform.OS === 'web') {
      try {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
      } catch (e) {
        console.error('Error saving to localStorage', e);
      }
    }
  },

  async getSession(): Promise<{ token: string | null; user: UserProfile | null }> {
    if (inMemoryToken && inMemoryUser) {
      return { token: inMemoryToken, user: inMemoryUser };
    }

    if (Platform.OS === 'web') {
      try {
        const token = localStorage.getItem('auth_token');
        const userJson = localStorage.getItem('auth_user');
        if (token && userJson) {
          inMemoryToken = token;
          inMemoryUser = JSON.parse(userJson);
          return { token, user: inMemoryUser };
        }
      } catch (e) {
        console.error('Error reading from localStorage', e);
      }
    }

    return { token: null, user: null };
  },

  async clearSession() {
    inMemoryToken = null;
    inMemoryUser = null;

    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      } catch (e) {
        console.error('Error clearing localStorage', e);
      }
    }
  }
};
