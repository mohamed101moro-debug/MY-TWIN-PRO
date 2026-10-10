import { session } from './SessionHolder';
import { presenceBridge } from './PresenceBridge';
import { existenceLoop } from './ExistenceLoop';
import { lifeIntentionBridge } from './LifeIntentionBridge';
import { stateBus } from './StateBus';
import { apiGet } from '../../lib/httpClient';

/**
 * Single frontend lifecycle owner.
 * Routes/components request bootstrap/refresh only; they do not start engines.
 */
class BootstrapCoordinator {
  private started = false;
  private booting: Promise<void> | null = null;
  private userId = '';

  async bootstrap(): Promise<void> {
    if (this.started) return;
    if (this.booting) return this.booting;
    this.booting = this.startInternal();
    try { await this.booting; } finally { this.booting = null; }
  }

  private async startInternal(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.userId = String(session.userId || '');
    try {
      presenceBridge.start();
      lifeIntentionBridge.start();
      await existenceLoop.start();
      await this.restoreState();
    } catch (error) {
      existenceLoop.stop();
      lifeIntentionBridge.stop();
      presenceBridge.stop();
      this.started = false;
      throw error;
    }
  }

  private async restoreState(): Promise<void> {
    if (!this.userId) return;
    try {
      const st: any = await apiGet('/api/twin/state');
      const harmony = Number(st?.soul_state?.resonance?.harmony ?? st?.relationship?.connection);
      const energy = Number(st?.presence_binding?.energy ?? st?.energy_level ?? st?.soul_state?.energy ?? st?.energy);
      const bond = Number(st?.bond_depth ?? st?.relationship?.bond_level ?? st?.bond_level);
      stateBus.patch({
        ...(st?.cognitive_state ? { cognitiveState: st.cognitive_state } : {}),
        ...(st?.brain_meaning ? { brainMeaning: st.brain_meaning } : {}),
        ...(st?.life_intention ? { lifeIntention: st.life_intention } : {}),
        ...(st?.presence_binding ? { presenceBinding: st.presence_binding } : {}),
        ...(st?.continuity ? {
          continuity: st.continuity,
          lastThought: String(st.continuity.last_thought ?? '').slice(0, 1000),
          pendingQuestions: Array.isArray(st.continuity.pending_questions) ? st.continuity.pending_questions.slice(-5) : [],
          cognitiveLoad: Math.max(0, Math.min(1, Number(st.continuity.cognitive_load ?? 0))),
        } : {}),
        ...(Number.isFinite(harmony) ? { connection: Math.max(0, Math.min(1, harmony)) } : {}),
        ...(Number.isFinite(energy) ? { energy: Math.max(0, Math.min(1, energy)) } : {}),
        ...(Number.isFinite(bond) ? { relationship: { bondLevel: Math.max(0, Math.min(100, bond <= 1 ? bond * 100 : bond)) } } : {}),
      });
      const emotion = st?.mood ?? st?.soul_state?.emotion ?? st?.emotion;
      if (emotion && String(emotion).toLowerCase() !== 'unknown') stateBus.updateFromUnifiedResponse({
        emotion: { primaryEmotion: emotion, intensity: st?.soul_state?.emotion_intensity ?? 0.5 },
        source: 'backend_restore', timestamp: Date.now(),
      });
    } catch {}
  }

  async refreshUser(userId: string): Promise<void> {
    this.userId = String(userId || '');
    session.userId = this.userId;
    if (!this.started) await this.bootstrap();
    await this.restoreState();
    await lifeIntentionBridge.onSessionReady(this.userId);
  }

  stop(): void {
    if (!this.started) return;
    existenceLoop.stop();
    lifeIntentionBridge.stop();
    presenceBridge.stop();
    this.started = false;
    this.userId = '';
  }
}

export const bootstrapCoordinator = new BootstrapCoordinator();
