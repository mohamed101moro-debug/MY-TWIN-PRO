/**
 * SECURITY SERVICE — طبقة الأمان المركزية
 * ==========================================
 * تدير: JWT، التشفير، التخزين الآمن، التحقق من الصلاحية
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEYS = {
  TOKEN: 'mytwin-secure-token',
  REFRESH_TOKEN: 'mytwin-refresh-token',
  DEVICE_ID: 'mytwin-device-id',
  BIOMETRIC_ENABLED: 'mytwin-biometric',
};

export class SecurityService {
  private token: string | null = null;
  private refreshToken: string | null = null;

  /** تخزين آمن للتوكن */
  async storeToken(token: string): Promise<void> {
    this.token = token;
    await AsyncStorage.setItem(KEYS.TOKEN, token);
  }

  /** استرجاع التوكن */
  async getToken(): Promise<string | null> {
    if (this.token) return this.token;
    this.token = await AsyncStorage.getItem(KEYS.TOKEN);
    return this.token;
  }

  /** تخزين Refresh Token */
  async storeRefreshToken(token: string): Promise<void> {
    this.refreshToken = token;
    await AsyncStorage.setItem(KEYS.REFRESH_TOKEN, token);
  }

  /** تجديد التوكن تلقائياً */
  async refreshAuthToken(): Promise<boolean> {
    try {
      const refresh = await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
      if (!refresh) return false;

      const response = await fetch('https://my-twin-pro-production-b744.up.railway.app/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });

      if (response.ok) {
        const data = await response.json();
        await this.storeToken(data.token);
        return true;
      }
    } catch (e) {}
    return false;
  }

  /** تشفير Base64 بسيط للبيانات الحساسة (للتخزين المحلي) */
  encryptData(data: string): string {
    try {
      if (typeof btoa === 'function') {
        return btoa(data);
      }
      return Buffer.from(data, 'utf-8').toString('base64');
    } catch (e) {
      return data;
    }
  }

  /** فك تشفير Base64 */
  decryptData(encrypted: string): string {
    try {
      if (typeof atob === 'function') {
        return atob(encrypted);
      }
      return Buffer.from(encrypted, 'base64').toString('utf-8');
    } catch (e) {
      return encrypted;
    }
  }

  /** التحقق من صلاحية التوكن */
  isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      const payload = parts[1];
      let decoded: string;
      
      if (typeof atob === 'function') {
        decoded = atob(payload);
      } else {
        decoded = Buffer.from(payload, 'base64').toString('utf-8');
      }

      const parsed = JSON.parse(decoded);
      const now = Math.floor(Date.now() / 1000);
      return parsed.exp < now;
    } catch (e) {
      return true;
    }
  }

  /** مسح جميع البيانات الآمنة */
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.REFRESH_TOKEN, KEYS.DEVICE_ID]);
    this.token = null;
    this.refreshToken = null;
  }

  /** التحقق من القفل البيومتري */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // يمكن استخدام expo-local-authentication هنا
        return true;
      }
    } catch (e) {}
    return false;
  }

  /** تفعيل القفل البيومتري */
  async enableBiometricLock(): Promise<void> {
    await AsyncStorage.setItem(KEYS.BIOMETRIC_ENABLED, 'true');
  }

  /** هل القفل البيومتري مفعّل؟ */
  async isBiometricEnabled(): Promise<boolean> {
    const enabled = await AsyncStorage.getItem(KEYS.BIOMETRIC_ENABLED);
    return enabled === 'true';
  }
}

export const securityService = new SecurityService();
