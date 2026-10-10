/**
 * S6A.1 — Canonical Digital Passport client.
 *
 * The frontend no longer manufactures identity or passport timestamps. The
 * backend canonical passport is the only authority. If identity is unavailable,
 * this client fails closed instead of constructing a local entity.
 */
import { apiGet } from '../../lib/httpClient';

export interface DigitalPassport {
  passport_id: string;
  entity_id: string;
  entity_name: string;
  entity_type: string;
  schema_version: string;
  origin: Record<string, unknown>;
  birth: { created_at: string; source: string };
  identity: { version: number; traits: string[]; continuity_revision: number };
  memory: { total_memories: number };
  governance: { constitution_version: string; human_authority: boolean };
  capabilities: Record<string, unknown>;
  provenance: Record<string, unknown>;
  version: { passport_version: string };
  current_state: { continuity_schema_version: string; continuity_revision: number; last_experience_at?: string | null };
  integrity_hash: string;
  generated_at: string;
}

export class EntityIdentityUnavailableError extends Error {
  readonly code = 'entity_identity_unavailable';
  constructor(message = 'Canonical entity identity is unavailable') {
    super(message);
    this.name = 'EntityIdentityUnavailableError';
  }
}

function isUUID(value: unknown): boolean {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function assertCanonicalPassport(value: unknown): asserts value is DigitalPassport {
  const p = value as Partial<DigitalPassport> | null;
  if (!p || typeof p !== 'object' || !isUUID(p.entity_id) || !p.passport_id || !p.integrity_hash || !p.schema_version) {
    throw new EntityIdentityUnavailableError('Invalid canonical passport payload');
  }
  if (!p.passport_id.startsWith('SSS-DP-')) {
    throw new EntityIdentityUnavailableError('Invalid canonical passport identifier');
  }
}

export class DigitalPassportEngine {
  async generate(): Promise<DigitalPassport> {
    try {
      const passport = await apiGet('/api/v1/passport');
      assertCanonicalPassport(passport);
      return passport;
    } catch (error: any) {
      if (error?.message === 'entity_identity_unavailable' || error?.code === 'entity_identity_unavailable' || error?.message?.includes('503')) {
        throw new EntityIdentityUnavailableError();
      }
      throw error;
    }
  }

  async refresh(): Promise<DigitalPassport> {
    return this.generate();
  }
}

export const digitalPassportEngine = new DigitalPassportEngine();
