/**
 * Platform-aware secure storage
 *  - Native (iOS/Android): expo-secure-store  (encrypted)
 *  - Web: localStorage  (not encrypted, acceptable for dev)
 */
import { Platform } from 'react-native';

let SecureStore;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

export const storage = {
  getItem: async (key) => {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    return SecureStore.getItemAsync(key);
  },

  setItem: async (key, value) => {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(key, value); } catch {}
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },

  removeItem: async (key) => {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(key); } catch {}
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};
