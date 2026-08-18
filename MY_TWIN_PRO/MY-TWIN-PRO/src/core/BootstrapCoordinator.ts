import { session } from './SessionHolder';
import { sensorBridge } from './SensorBridge';
import { devicePresenceEngine } from '../../engine/device/DevicePresenceEngine';
import { stateBus } from './StateBus';
import { apiGet } from '../../lib/httpClient';
/** إقلاع إنتاجي مت idempotent: حواس + استعادة الحالة العاطفية من الخلفية. */
class BootstrapCoordinator {
  private done = false;
  async bootstrap(): Promise<void> {
    if (this.done) return;
    this.done = true;
    try { devicePresenceEngine.start(); sensorBridge.start(); } catch {}
    try {
      const st: any = await apiGet(`/api/twin/state?user_id=${session.userId}`);
      const harmony = Number(st?.soul_state?.resonance?.harmony ?? 0.3);
      stateBus.patch({ connection: Math.max(stateBus.getState().connection, harmony) });
    } catch {}
  }
}
export const bootstrapCoordinator = new BootstrapCoordinator();
