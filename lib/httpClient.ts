/**
 * httpClient.ts – SoulSync MyTwin AI
 * عميل HTTP متكامل مع timeout + retry + streaming
 */

import { Alert } from 'react-native';
import Constants from 'expo-constants';
import { resolveApiBaseUrl } from '../engine/config/apiBaseUrl';
import { clearCredentialStorage, getAccessToken, setAccessToken } from './credentialStore';

export const API_BASE_URL = resolveApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL,
  Constants.expoConfig?.extra?.API_URL,
);

// ================================================================
// الإعدادات
// ================================================================
const TIMEOUT_MS       = 12000; // 12 ثانية - يكفي لـ Railway cold start
const RETRY_COUNT      = 2;
const RETRY_DELAY_MS   = 800;
const activeControllers = new Set<AbortController>();
let requestGeneration = 0;

/** Abort in-flight work and prevent an old session from retrying under a new token. */
export function cancelPendingRequests(): void {
  requestGeneration += 1;
  activeControllers.forEach((controller) => controller.abort());
  activeControllers.clear();
}

// ================================================================
// إدارة الـ Token
// ================================================================
export async function setToken(token: string): Promise<void> {
  await setAccessToken(token);
}

export async function removeToken(): Promise<void> {
  await clearCredentialStorage();
}

async function getToken(): Promise<string | null> {
  return getAccessToken();
}

// ================================================================
// fetch مع timeout حقيقي
// ================================================================
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  activeControllers.add(controller);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    throw err;
  } finally {
    clearTimeout(timer);
    activeControllers.delete(controller);
  }
}

// ================================================================
// استخراج رسالة الخطأ بأمان
// ================================================================
function extractErrorMessage(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>;
    for (const k of ['message', 'detail', 'error']) {
      if (typeof o[k] === 'string') return o[k] as string;
    }
  }
  return 'Unknown error';
}

// ================================================================
// طبيعة الخطأ وهل يستحق الـ retry
// ================================================================
function isRetryable(error: unknown): boolean {
  const msg = extractErrorMessage(error).toLowerCase();
  // لا نعيد المحاولة على أخطاء المصادقة والمدخلات
  if (msg.includes('401') || msg.includes('403') ||
      msg.includes('400') || msg.includes('404')) return false;
  return true;
}

// ================================================================
// الدالة الأساسية
// ================================================================
async function request(
  endpoint: string,
  options: RequestInit = {},
  retries = RETRY_COUNT,
  timeoutMs = TIMEOUT_MS,
): Promise<any> {
  const generation = requestGeneration;
  const token = await getToken();
  if (generation !== requestGeneration) throw new Error('SESSION_CHANGED');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${API_BASE_URL}${endpoint}`;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, { ...options, headers }, timeoutMs);
      if (generation !== requestGeneration) throw new Error('SESSION_CHANGED');

      // ── معالجة استجابة غير ناجحة ─────────────────────────
      if (!response.ok) {
        // 401 → نحاول مرة واحدة فقط
        if (response.status === 401 && attempt < retries) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
        // استخراج تفاصيل الخطأ من الـ body
        let errMsg = `HTTP ${response.status}`;
        try {
          const errBody = await response.json();
          errMsg = errBody?.detail || errBody?.message || errBody?.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      // ── استجابة ناجحة ────────────────────────────────────
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text();

    } catch (err: unknown) {
      if (generation !== requestGeneration) throw new Error('SESSION_CHANGED');
      lastError = err;
      const msg = extractErrorMessage(err);

      // timeout
      if (msg === 'TIMEOUT') {
        console.warn(`[HTTP] Timeout on attempt ${attempt + 1}: ${endpoint}`);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        throw new Error(
          'انتهت مهلة الاتصال. تأكد من اتصالك بالإنترنت وحاول مجدداً.'
        );
      }

      // خطأ شبكة
      const isNetworkErr =
        msg.includes('Network request failed') ||
        msg.includes('Failed to fetch')        ||
        msg.includes('fetch failed')           ||
        msg.includes('network');

      if (isNetworkErr) {
        console.warn(`[HTTP] Network error attempt ${attempt + 1}: ${endpoint}`);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        throw new Error('لا يوجد اتصال بالإنترنت. تحقق من شبكتك وحاول مجدداً.');
      }

      // خطأ لا يستحق retry
      if (!isRetryable(err)) throw err;

      // retry عادي
      if (attempt < retries) {
        console.warn(`[HTTP] Retrying (${attempt + 1}/${retries}): ${endpoint}`);
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        continue;
      }

      throw err;
    }
  }

  throw lastError ?? new Error('Request failed');
}

// ================================================================
// دوال عامة
// ================================================================
export async function apiPost(
  endpoint: string,
  data: any = {},
  timeoutMs = TIMEOUT_MS,
): Promise<any> {
  return request(endpoint, { method: 'POST', body: JSON.stringify(data) }, RETRY_COUNT, timeoutMs);
}

export async function apiGet(
  endpoint: string,
  timeoutMs = TIMEOUT_MS,
): Promise<any> {
  return request(endpoint, { method: 'GET' }, RETRY_COUNT, timeoutMs);
}

export async function apiDelete(
  endpoint: string,
  timeoutMs = TIMEOUT_MS,
): Promise<any> {
  return request(endpoint, { method: 'DELETE' }, RETRY_COUNT, timeoutMs);
}

export async function apiPut(
  endpoint: string,
  data: any = {},
  timeoutMs = TIMEOUT_MS,
): Promise<any> {
  return request(endpoint, { method: 'PUT', body: JSON.stringify(data) }, RETRY_COUNT, timeoutMs);
}

// ================================================================
// streaming للمحادثة الحية
// ================================================================
export async function apiStream(
  endpoint: string,
  data: any = {},
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): Promise<void> {
  const generation = requestGeneration;
  const token = await getToken();
  if (generation !== requestGeneration) return;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  activeControllers.add(controller);
  const timer = setTimeout(() => controller.abort(), 30000); // 30 ثانية للـ streaming

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    if (generation !== requestGeneration) return;

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!response.body) throw new Error('No response body');

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      if (generation !== requestGeneration) return;
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') { onDone(); return; }
        try {
          const parsed = JSON.parse(raw);
          const text = parsed?.choices?.[0]?.delta?.content
            || parsed?.text
            || parsed?.reply
            || '';
          if (text) onChunk(text);
        } catch {}
      }
    }
    onDone();
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      onError('انتهت مهلة الاتصال');
    } else {
      onError(extractErrorMessage(err));
    }
  } finally {
    clearTimeout(timer);
    activeControllers.delete(controller);
  }
}
