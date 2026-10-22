import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventBus } from './EventBus';
import { apiPost } from '../../lib/httpClient';
import { session } from './SessionHolder';
import { stateBus } from './StateBus';

export interface LifeEvidence {
  evidence: Record<string, unknown>;
  timestamp: number;
  intention_id?: string;
}

interface PendingLifeEvidence extends LifeEvidence {
  queue_id: string;
  user_id: string;
  created_at: number;
  attempts: number;
  next_attempt_at: number;
}

const STORAGE_KEY = 'mytwin.lifecycle_evidence.v1';
const MAX_QUEUE = 256;
const RETRY_BASE_MS = 1500;
const RETRY_MAX_MS = 5 * 60 * 1000;
const FLUSH_INTERVAL_MS = 30_000;

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map(k => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

function shortHash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

function sanitizeEvidence(raw: unknown): Record<string, unknown> {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const safe: Record<string, unknown> = {};
  if (typeof source.phase === 'string') safe.phase = source.phase.slice(0, 32);
  const energy = Number(source.energy);
  if (Number.isFinite(energy)) safe.energy = Math.max(0, Math.min(1, energy));
  if (typeof source.should_rest === 'boolean') safe.should_rest = source.should_rest;
  if (typeof source.is_deep_sleep === 'boolean') safe.is_deep_sleep = source.is_deep_sleep;
  return safe;
}

async function readQueue(): Promise<PendingLifeEvidence[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('lifecycle_queue_corrupt');
  return parsed
    .filter((item: any) => item && typeof item === 'object' && typeof item.user_id === 'string')
    .map((item: PendingLifeEvidence) => ({ ...item, evidence: sanitizeEvidence(item.evidence) }))
    .filter((item: PendingLifeEvidence) => Object.keys(item.evidence).length > 0);
}

async function writeQueue(queue: PendingLifeEvidence[]): Promise<void> {
  if (queue.length > MAX_QUEUE) throw new Error('lifecycle_queue_capacity_exceeded');
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Presence → backend evidence transport.
 *
 * The device is allowed to observe and durably queue evidence, but never to
 * classify lifecycle meaning, mutate relationship, or manufacture cognition.
 * A queued event survives process termination and is removed only after the
 * backend acknowledges the canonical atomic commit (including deduplicated
 * acknowledgements).
 */
class LifeIntentionBridge {
  private active = false;
  private unsubscribe: (() => void) | null = null;
  private appStateSub: { remove: () => void } | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private lastSentKey = '';
  private lastSentAt = 0;

  start(): void {
    if (this.active) return;
    this.active = true;
    this.unsubscribe = EventBus.on('LIFE_EVIDENCE', (_event: any, data?: any) => {
      const payload = (data ?? _event) as LifeEvidence;
      void this.accept(payload);
    });
    this.appStateSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void this.flush();
    });
    this.flushTimer = setInterval(() => { void this.flush(); }, FLUSH_INTERVAL_MS);
    void this.flush();
  }

  private async accept(payload: LifeEvidence): Promise<void> {
    if (!this.active || !payload?.evidence) return;
    const userId = String(session.userId || '');
    if (!userId) return;

    const evidence = sanitizeEvidence(payload.evidence);
    if (!Object.keys(evidence).length) return;
    const timestamp = Number(payload.timestamp || Date.now());
    const semanticKey = `${userId}:${stableStringify(evidence)}:${Number.isFinite(timestamp) ? timestamp : 0}`;
    const queueId = payload.intention_id || `${timestamp}-${shortHash(semanticKey)}`;

    // In-memory debounce prevents the 30-second existence loop from creating
    // unnecessary writes. Durable deduplication remains a backend authority.
    const now = Date.now();
    const localKey = `${stableStringify(evidence)}:${timestamp}`;
    if (localKey === this.lastSentKey && now - this.lastSentAt < 5 * 60 * 1000) return;

    const queue = await readQueue();
    const alreadyQueued = queue.some(item => item.user_id === userId && item.queue_id === queueId);
    if (!alreadyQueued && queue.length >= MAX_QUEUE) {
      // Never evict old evidence to make room for new evidence. Dropping the
      // oldest lifecycle event would violate the durability contract.
      throw new Error('lifecycle_queue_capacity_exceeded');
    }
    if (!alreadyQueued) {
      queue.push({
        queue_id: queueId,
        user_id: userId,
        evidence,
        timestamp,
        intention_id: payload.intention_id || queueId,
        created_at: now,
        attempts: 0,
        next_attempt_at: now,
      });
      await writeQueue(queue);
    }
    await this.flush();
  }

  private async send(item: PendingLifeEvidence): Promise<'accepted' | 'retry' | 'discard'> {
    if (String(session.userId || '') !== item.user_id) return 'retry';
    try {
      const response: any = await apiPost('/api/twin/life-intention', {
        intention_id: item.intention_id,
        evidence: item.evidence,
        observed_at: new Date(item.timestamp || item.created_at).toISOString(),
      }, 8000);
      this.applyAuthoritativeResponse(response);
      this.lastSentKey = `${stableStringify(item.evidence)}:${item.timestamp}`;
      this.lastSentAt = Date.now();
      return 'accepted';
    } catch (error: any) {
      const message = String(error?.message || error || '').toLowerCase();
      // Invalid payloads cannot become valid by retrying. Authentication is
      // retained for the next authenticated session; transient failures retry.
      if (message.includes('400') || message.includes('422')) return 'discard';
      return 'retry';
    }
  }

  private applyAuthoritativeResponse(response: any): void {
    const binding = response?.presence_binding;
    const authoritativeEnergy = Number(binding?.energy);
    stateBus.patch({
      ...(response?.brain_meaning ? { brainMeaning: response.brain_meaning } : {}),
      ...(response?.life_intention ? { lifeIntention: response.life_intention } : {}),
      ...(binding ? { presenceBinding: binding } : {}),
      ...(Number.isFinite(authoritativeEnergy) ? { energy: Math.max(0, Math.min(1, authoritativeEnergy)) } : {}),
    });
  }

  async flush(): Promise<void> {
    if (!this.active || this.flushing || !session.userId) return;
    this.flushing = true;
    try {
      const queue = await readQueue();
      const now = Date.now();
      const currentUser = String(session.userId);
      const remaining: PendingLifeEvidence[] = [];
      for (const item of queue) {
        if (item.user_id !== currentUser || item.next_attempt_at > now) {
          remaining.push(item);
          continue;
        }
        const result = await this.send(item);
        if (result === 'accepted' || result === 'discard') continue;
        const attempts = item.attempts + 1;
        const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * Math.pow(2, Math.min(attempts, 8)));
        remaining.push({ ...item, attempts, next_attempt_at: Date.now() + delay });
      }
      await writeQueue(remaining);
    } catch (error) {
      // Storage corruption/write failure is fail-closed: the queue is never
      // replaced with an empty array and pending evidence is never silently
      // discarded. The next lifecycle/app-state trigger can retry the flush.
      console.error('[LifeIntentionBridge] durable queue failure:', error);
    } finally {
      this.flushing = false;
    }
  }

  async onSessionReady(userId: string): Promise<void> {
    if (!this.active || !userId) return;
    session.userId = userId;
    await this.flush();
  }

  stop(): void {
    this.active = false;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.appStateSub?.remove();
    this.appStateSub = null;
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
  }
}

export const lifeIntentionBridge = new LifeIntentionBridge();
