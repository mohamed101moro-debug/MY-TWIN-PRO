/** Offline chat support with per-user isolation, single-flight replay and explicit acknowledgements. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost } from './httpClient';
import { stateBus } from '../src/core/StateBus';
import { LIVING_ERRORS } from './livingErrors';

const Q = 'mytwin_offline_queue';
const C = 'mytwin_response_cache';
const DL = 'mytwin_offline_dead_letter';
const USER_KEY = 'mytwin-user';
const MAX = 100;
const RETRIES = 3;

interface Queued {
  id: string;
  userId: string | null;
  message: string;
  timestamp: number;
  retries: number;
  lang?: string;
  lastError?: string;
}
interface DeadLetter extends Queued { failedAt: number; }
type CacheMap = Record<string, { reply: string; timestamp: number }>;

let queueGeneration = 0;
let queueRun: Promise<number> | null = null;

export async function cacheResponse(query: string, reply: string): Promise<void> {
  try {
    const entries = await readCache();
    const key = await scopedHash(query);
    entries[key] = { reply, timestamp: Date.now() };
    const ordered = Object.entries(entries).sort((a, b) => a[1].timestamp - b[1].timestamp);
    while (ordered.length > MAX) delete entries[ordered.shift()![0]];
    await AsyncStorage.setItem(C, JSON.stringify(entries));
  } catch {}
}

export async function getCachedResponse(message: string): Promise<string | null> {
  try {
    const key = await scopedHash(message);
    const entry = (await readCache())[key];
    return entry && Date.now() - entry.timestamp < 3600_000 ? entry.reply : null;
  } catch {
    return null;
  }
}

async function scopedHash(text: string): Promise<string> {
  const userId = await AsyncStorage.getItem(USER_KEY).catch(() => null);
  return hash(`${userId || 'guest'}:${text}`);
}

async function readCache(): Promise<CacheMap> {
  try {
    const raw = await AsyncStorage.getItem(C);
    return raw ? JSON.parse(raw) as CacheMap : {};
  } catch {
    return {};
  }
}

function hash(text: string): string {
  let value = 0;
  for (let index = 0; index < text.length; index += 1) {
    value = ((value << 5) - value) + text.charCodeAt(index);
    value |= 0;
  }
  return Math.abs(value).toString(36);
}

export async function getOfflineReply(message: string): Promise<string> {
  return (await getCachedResponse(message)) || LIVING_ERRORS.NETWORK;
}

export async function addToOfflineQueue(message: string, lang?: string): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    const userId = await AsyncStorage.getItem(USER_KEY).catch(() => null);
    queue.push({
      id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      message,
      timestamp: Date.now(),
      retries: 0,
      lang,
    });
    await AsyncStorage.setItem(Q, JSON.stringify(queue.slice(-MAX)));
  } catch {}
}

export async function getOfflineQueue(): Promise<Queued[]> {
  try {
    const raw = await AsyncStorage.getItem(Q);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export async function getOfflineDeadLetters(): Promise<DeadLetter[]> {
  try {
    const currentUser = await AsyncStorage.getItem(USER_KEY).catch(() => null);
    const raw = await AsyncStorage.getItem(DL);
    const value = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    return value.filter((item: DeadLetter) => item.userId === currentUser);
  } catch {
    return [];
  }
}

export async function clearOfflineSessionData(): Promise<void> {
  queueGeneration += 1;
  try {
    await AsyncStorage.multiRemove([Q, C, DL]);
  } catch {}
}

export async function processOfflineQueue(): Promise<number> {
  if (queueRun) return queueRun;
  const generation = queueGeneration;
  const run = (async () => {
    const queue = await getOfflineQueue();
    const currentUser = await AsyncStorage.getItem(USER_KEY).catch(() => null);
    if (generation !== queueGeneration || queue.length === 0) return 0;

    let completed = 0;
    const retryQueue: Queued[] = [];
    const failed: DeadLetter[] = [];

    for (const item of queue) {
      if (generation !== queueGeneration) return 0;
      // Never replay anonymous or another account's queued message under this session.
      if (!currentUser || item.userId !== currentUser) continue;
      try {
        const acknowledgement = await apiPost('/api/chat', { message: item.message, lang: item.lang || 'ar' });
        if (generation !== queueGeneration) return 0;
        if (!acknowledgement || typeof acknowledgement.reply !== 'string' || !acknowledgement.reply.trim()) {
          throw new Error('Invalid chat acknowledgement');
        }
        completed += 1;
      } catch (error) {
        if (generation !== queueGeneration) return 0;
        const lastError = error instanceof Error ? error.message.slice(0, 180) : 'Unknown replay error';
        if (item.retries < RETRIES) retryQueue.push({ ...item, retries: item.retries + 1, lastError });
        else failed.push({ ...item, retries: item.retries + 1, lastError, failedAt: Date.now() });
      }
    }

    if (generation !== queueGeneration) return 0;
    await AsyncStorage.setItem(Q, JSON.stringify(retryQueue));
    if (failed.length) {
      const existing = await getOfflineDeadLetters();
      await AsyncStorage.setItem(DL, JSON.stringify([...existing, ...failed].slice(-MAX)));
    }
    return completed;
  })();

  queueRun = run;
  try {
    return await run;
  } finally {
    if (queueRun === run) queueRun = null;
  }
}

type Cb = (online: boolean) => void;
const listeners: Cb[] = [];
let online = true;

export function onNetworkChange(callback: Cb): () => void {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  };
}

export function setNetworkStatus(connected: boolean): void {
  if (online === connected) return;
  online = connected;
  stateBus.update({ isOnline: connected, isDegraded: !connected });
  listeners.forEach((callback) => callback(connected));
  if (connected) processOfflineQueue().catch(() => {});
}

export function getNetworkStatus(): boolean {
  return online;
}
