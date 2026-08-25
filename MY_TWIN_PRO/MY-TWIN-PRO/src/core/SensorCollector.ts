import { Accelerometer, Gyroscope, LightSensor, Barometer, Magnetometer, Pedometer } from 'expo-sensors';
/**
 * SensorCollector v2.0 — جامع الحساسات المُدار (إصلاح تسريب الإنتاج)
 * ==================================================================
 * المشكلة التاريخية (ملاحظة #5): addListener بدون حفظ الـ subscriptions
 * ⇒ مع إعادة التشغيل تتراكم listeners مكررة وتسرب موارد.
 * الحل الجذري:
 * - كل اشتراك يُدفع في this.subs ويُزال في stop() دائمًا (remove() آمن).
 * - كل حساس محروس بـ isAvailableAsync ⇒ جهاز بلا حساس ≠ كراش.
 * - فواصل تحديث مضبوطة (بطارية): حركة 100ms / ضوء 1s / ضغط 1s / خطوات 5s.
 * - عقد ثابت للمستهلكين: getReadings()/subscribe()/start()/stop()
 *   (DevicePresenceEngine يقرأ lightLevel/accelerometer/pressure/steps…).
 */
export interface SensorReadings {
  accelerometer: { x: number; y: number; z: number } | null;
  gyroscope: { x: number; y: number; z: number } | null;
  magnetometer: { x: number; y: number; z: number } | null;
  lightLevel: number | null;   // lux (illuminance)
  pressure: number | null;     // hPa
  steps: number | null;        // تراكمي
  lastMotionTs: number;
}
type Sub = { remove?: () => void };

class SensorCollector {
  private subs: Sub[] = [];
  private running = false;
  private listeners = new Set<(r: SensorReadings) => void>();
  private readings: SensorReadings = {
    accelerometer: null, gyroscope: null, magnetometer: null,
    lightLevel: null, pressure: null, steps: null, lastMotionTs: 0,
  };

  get isRunning(): boolean { return this.running; }
  getReadings(): SensorReadings { return { ...this.readings }; }
  subscribe(fn: (r: SensorReadings) => void): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
  private notify(): void {
    const snap = this.getReadings();
    this.listeners.forEach((l) => { try { l(snap); } catch {} });
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const attach = async (
      isAvail: () => Promise<boolean>,
      wire: () => Sub | null
    ) => {
      try {
        if (await isAvail()) {
          const s = wire();
          if (s) this.subs.push(s); // ← يُحفظ دائمًا ⇒ يُزال دائمًا
        }
      } catch {}
    };

    await attach(
      () => Accelerometer.isAvailableAsync(),
      () => {
        Accelerometer.setUpdateInterval(100);
        return Accelerometer.addListener((d) => {
          this.readings.accelerometer = d;
          this.readings.lastMotionTs = Date.now();
          this.notify();
        });
      }
    );
    await attach(
      () => Gyroscope.isAvailableAsync(),
      () => {
        Gyroscope.setUpdateInterval(150);
        return Gyroscope.addListener((d) => { this.readings.gyroscope = d; });
      }
    );
    await attach(
      () => Magnetometer.isAvailableAsync(),
      () => {
        Magnetometer.setUpdateInterval(200);
        return Magnetometer.addListener((d) => { this.readings.magnetometer = d; });
      }
    );
    await attach(
      () => LightSensor.isAvailableAsync(),
      () => {
        LightSensor.setUpdateInterval(1000);
        return LightSensor.addListener((d: any) => {
          this.readings.lightLevel = typeof d?.illuminance === 'number' ? d.illuminance : null;
          this.notify();
        });
      }
    );
    await attach(
      () => Barometer.isAvailableAsync(),
      () => {
        Barometer.setUpdateInterval(1000);
        return Barometer.addListener((d: any) => {
          this.readings.pressure = typeof d?.pressure === 'number' ? d.pressure : null;
        });
      }
    );
    await attach(
      () => Pedometer.isAvailableAsync(),
      () => {
        try { (Pedometer as any).setUpdateInterval?.(5000); } catch {}
        const addL = (Pedometer as any).addListener; if (!addL) return null; return addL.call(Pedometer, (d: any) => {
          if (typeof d?.steps === 'number') this.readings.steps = d.steps;
        });
      }
    );
  }

  /** إزالة كل الاشتراكات — لا تسريب ممكن بعد الآن */
  stop(): void {
    this.running = false;
    this.subs.forEach((s) => { try { s?.remove?.(); } catch {} });
    this.subs = [];
  }
}

export const sensorCollector = new SensorCollector();
export default sensorCollector;
