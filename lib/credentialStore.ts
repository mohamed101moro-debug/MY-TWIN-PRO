import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'mytwin.access-token.v1';
const REFRESH_TOKEN_KEY = 'mytwin.refresh-token.v1';
const LEGACY_ACCESS_KEYS = ['mytwin-token', 'mytwin-secure-token'] as const;
const LEGACY_REFRESH_KEYS = ['mytwin-refresh-token'] as const;

async function migrateLegacyValue(
  secureKey: string,
  legacyKeys: readonly string[],
): Promise<string | null> {
  const secured = await SecureStore.getItemAsync(secureKey);
  if (secured !== null) return secured;

  for (const legacyKey of legacyKeys) {
    const legacyValue = await AsyncStorage.getItem(legacyKey);
    if (legacyValue === null) continue;

    // Never use or delete the plaintext value until the secure write is confirmed.
    await SecureStore.setItemAsync(secureKey, legacyValue);
    await AsyncStorage.multiRemove([...legacyKeys]);
    return legacyValue;
  }
  return null;
}

async function setCredential(
  secureKey: string,
  value: string,
  legacyKeys: readonly string[],
): Promise<void> {
  if (!value || !value.trim()) throw new Error('Credential must not be empty.');
  await SecureStore.setItemAsync(secureKey, value);
  await AsyncStorage.multiRemove([...legacyKeys]);
}

async function removeAll(keys: readonly string[]): Promise<void> {
  const failures: unknown[] = [];
  for (const key of keys) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      failures.push(error);
    }
  }
  try {
    await AsyncStorage.multiRemove([...LEGACY_ACCESS_KEYS, ...LEGACY_REFRESH_KEYS]);
  } catch (error) {
    failures.push(error);
  }
  if (failures.length > 0) {
    throw new Error('تعذر مسح بيانات الاعتماد بأمان.');
  }
}

export function getAccessToken(): Promise<string | null> {
  return migrateLegacyValue(ACCESS_TOKEN_KEY, LEGACY_ACCESS_KEYS);
}

export function setAccessToken(token: string): Promise<void> {
  return setCredential(ACCESS_TOKEN_KEY, token, LEGACY_ACCESS_KEYS);
}

export function getRefreshToken(): Promise<string | null> {
  return migrateLegacyValue(REFRESH_TOKEN_KEY, LEGACY_REFRESH_KEYS);
}

export function setRefreshToken(token: string): Promise<void> {
  return setCredential(REFRESH_TOKEN_KEY, token, LEGACY_REFRESH_KEYS);
}

export function clearCredentialStorage(): Promise<void> {
  return removeAll([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}
