import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  clearCredentialStorage,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from '../../../lib/credentialStore';

const secure = SecureStore as typeof SecureStore & { __values: Map<string, string> };

beforeEach(async () => {
  jest.clearAllMocks();
  secure.__values.clear();
  await AsyncStorage.clear();
});

describe('credentialStore', () => {
  it('stores new access tokens in SecureStore and removes plaintext copies', async () => {
    await AsyncStorage.setItem('mytwin-token', 'old-token');
    await setAccessToken('new-token');

    expect(await SecureStore.getItemAsync('mytwin.access-token.v1')).toBe('new-token');
    expect(await AsyncStorage.getItem('mytwin-token')).toBeNull();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('mytwin.access-token.v1', 'new-token');
  });

  it('migrates a legacy token only after SecureStore accepts it', async () => {
    await AsyncStorage.setItem('mytwin-token', 'legacy-token');

    await expect(getAccessToken()).resolves.toBe('legacy-token');
    expect(await SecureStore.getItemAsync('mytwin.access-token.v1')).toBe('legacy-token');
    expect(await AsyncStorage.getItem('mytwin-token')).toBeNull();
  });

  it('preserves the legacy token when secure migration fails', async () => {
    await AsyncStorage.setItem('mytwin-token', 'legacy-token');
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('keychain unavailable'));

    await expect(getAccessToken()).rejects.toThrow('keychain unavailable');
    expect(await AsyncStorage.getItem('mytwin-token')).toBe('legacy-token');
  });

  it('migrates a legacy refresh token into SecureStore', async () => {
    await AsyncStorage.setItem('mytwin-refresh-token', 'refresh-legacy');

    await expect(getRefreshToken()).resolves.toBe('refresh-legacy');
    expect(await AsyncStorage.getItem('mytwin-refresh-token')).toBeNull();
  });

  it('clears secure credentials and every legacy plaintext token key', async () => {
    secure.__values.set('mytwin.access-token.v1', 'access');
    secure.__values.set('mytwin.refresh-token.v1', 'refresh');
    await AsyncStorage.multiSet([
      ['mytwin-token', 'legacy-access'],
      ['mytwin-secure-token', 'legacy-secure-access'],
      ['mytwin-refresh-token', 'legacy-refresh'],
    ]);

    await clearCredentialStorage();

    expect(secure.__values.size).toBe(0);
    expect(await AsyncStorage.getItem('mytwin-token')).toBeNull();
    expect(await AsyncStorage.getItem('mytwin-secure-token')).toBeNull();
    expect(await AsyncStorage.getItem('mytwin-refresh-token')).toBeNull();
  });
});
