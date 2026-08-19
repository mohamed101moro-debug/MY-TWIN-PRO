import type { PresenceState } from '../../../engine/presence/PresenceTypes';
export type EntityState = 'idle'|'calm'|'listening'|'thinking'|'understanding'|'responding'|'happy'|'curious'|'sad'|'surprised'|'angry'|'sleepy';
/** حضور مستمر → حالة سلوكية للـ LivingEntity. */
export function presenceToEntity(p?: PresenceState | null): EntityState {
  if (!p) return 'idle';
  if (p.speaking) return 'responding';
  if (p.listening) return 'listening';
  if (p.thinking) return 'thinking';
  switch (p.emotion) {
    case 'happy': case 'caring': case 'excited': return 'happy';
    case 'curious': return 'curious';
    case 'sad': case 'afraid': return 'sad';
    case 'angry': return 'angry';
    case 'surprised': return 'surprised';
    case 'sleepy': return 'sleepy';
    case 'focused': return 'thinking';
    default: return p.energy > 0.35 ? 'calm' : 'idle';
  }
}
