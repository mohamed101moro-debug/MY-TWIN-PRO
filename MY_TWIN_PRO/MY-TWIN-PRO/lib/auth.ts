import * as SecureStore from 'expo-secure-store';
import { apiPost, setToken, removeToken as removeHttpToken } from './httpClient';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'mytwin-secure-token';
const LEGACY_TOKEN_KEY = 'mytwin-token';
const USER_KEY = 'mytwin-user';
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

async function readSecure(key: string): Promise<string | null> {
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
}

export async function saveAuthData(token: string, userId: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
  await SecureStore.setItemAsync(USER_KEY, userId, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
  await setToken(token);
}

export async function getToken(): Promise<string | null> {
  const secure = await readSecure(TOKEN_KEY);
  if (secure) return secure;
  // One-time migration for sessions created by pre-SecureStore builds.
  const legacy = await readSecure(LEGACY_TOKEN_KEY);
  if (legacy) {
    await SecureStore.setItemAsync(TOKEN_KEY, legacy);
    await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY).catch(() => undefined);
    return legacy;
  }
  return null;
}

export async function getUserId(): Promise<string | null> { return readSecure(USER_KEY); }

export async function removeToken(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(USER_KEY).catch(() => undefined),
    removeHttpToken(),
  ]);
}

export async function login(email: string, password: string): Promise<any> {
  const data = await apiPost('/api/auth/login', { email: email.trim(), password });
  if (data?.token && data?.user_id) await saveAuthData(data.token, data.user_id);
  return data;
}

export async function signup(email: string, password: string, twinName: string, lang: string = 'ar'): Promise<any> {
  const data = await apiPost('/api/auth/signup', { email: email.trim(), password, twin_name: twinName, lang });
  if (data?.token && data?.user_id) await saveAuthData(data.token, data.user_id);
  return data;
}

export async function googleLogin(lang: string = 'ar'): Promise<any> {
  if (!GOOGLE_CLIENT_ID) throw new Error('تسجيل Google غير مهيأ في إعدادات الإصدار.');
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'mytwin' });
  const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
  const request = new AuthSession.AuthRequest({ clientId: GOOGLE_CLIENT_ID, redirectUri, scopes: ['openid', 'profile', 'email'], responseType: AuthSession.ResponseType.Code, usePKCE: true });
  const result = await request.promptAsync(discovery);
  if (result.type === 'dismiss') throw new Error('تم إلغاء تسجيل الدخول.');
  if (result.type === 'success' && result.params.code) {
    const data = await apiPost('/api/auth/google', { code: result.params.code, redirect_uri: redirectUri, code_verifier: request.codeVerifier, lang });
    if (data?.token && data?.user_id) { await saveAuthData(data.token, data.user_id); return data; }
  }
  throw new Error('فشل تسجيل الدخول بـ Google.');
}

export async function logout(): Promise<void> { await removeToken(); }
export async function isAuthenticated(): Promise<boolean> { return !!(await getToken()); }
