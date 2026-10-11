import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, cancelPendingRequests } from './httpClient';
import { clearLocalSessionState } from './sessionBoundary';
import { getAccessToken, setAccessToken } from './credentialStore';
import { useTwinCoreStore } from '../store/useTwinCoreStore';
import { unifiedBrainBridge } from '../src/core/UnifiedBrainBridge';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const USER_KEY = 'mytwin-user';
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

export async function saveAuthData(token: string, userId: string): Promise<void> {
  const previousUserId = await getUserId();
  if (previousUserId !== userId) await clearLocalSessionState();
  else cancelPendingRequests();
  try {
    await setAccessToken(token);
    await AsyncStorage.setItem(USER_KEY, userId);
  } catch (error) {
    await clearLocalSessionState().catch(() => undefined);
    throw error;
  }
  useTwinCoreStore.getState().setAuth(userId);
  unifiedBrainBridge.setUserId(userId);
}
export async function getToken(): Promise<string | null> { return getAccessToken(); }
export async function getUserId(): Promise<string | null> { return AsyncStorage.getItem(USER_KEY); }
export async function removeToken(): Promise<void> { await clearLocalSessionState(); }

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
  if (!GOOGLE_CLIENT_ID) throw new Error('Google sign-in is not configured for this build.');
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'mytwin' });
  const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
  const request = new AuthSession.AuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });
  const result = await request.promptAsync(discovery);
  if (result.type === 'dismiss') throw new Error('تم إلغاء تسجيل الدخول.');
  if (result.type === 'success' && result.params.code) {
    const data = await apiPost('/api/auth/google', {
      code: result.params.code,
      redirect_uri: redirectUri,
      code_verifier: request.codeVerifier,
      lang,
    });
    if (data?.token && data?.user_id) {
      await saveAuthData(data.token, data.user_id);
      return { token: data.token, user_id: data.user_id, onboarded: data.onboarded || false };
    }
    throw new Error('تعذر التحقق من حساب Google على الخادم.');
  }
  throw new Error('فشل تسجيل الدخول بـ Google.');
}

export async function logout(): Promise<void> { await clearLocalSessionState(); }
export async function isAuthenticated(): Promise<boolean> { return !!(await getToken()); }
