jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-auth-session', () => ({}));

import * as SecureStore from 'expo-secure-store';
import { getToken, removeToken, saveAuthData } from '../../lib/auth';

const store = SecureStore as typeof SecureStore & {
  __reset: () => void;
  __seed: (key: string, value: string) => void;
  __read: (key: string) => string | undefined;
};

describe('auth SecureStore contract', () => {
  beforeEach(() => {
    store.__reset();
    jest.clearAllMocks();
  });

  it('migrates a legacy token into the secure key and removes the legacy value', async () => {
    store.__seed('mytwin-token', 'legacy-token');

    await expect(getToken()).resolves.toBe('legacy-token');
    expect(store.__read('mytwin-secure-token')).toBe('legacy-token');
    expect(store.__read('mytwin-token')).toBeUndefined();
  });

  it('stores identity securely and logout removes all auth material', async () => {
    await saveAuthData('secure-token', 'user-a');
    expect(store.__read('mytwin-secure-token')).toBe('secure-token');
    expect(store.__read('mytwin-user')).toBe('user-a');

    await removeToken();
    expect(store.__read('mytwin-secure-token')).toBeUndefined();
    expect(store.__read('mytwin-user')).toBeUndefined();
    expect(store.__read('mytwin-token')).toBeUndefined();
  });
});
