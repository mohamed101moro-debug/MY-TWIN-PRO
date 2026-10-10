import { EventBus } from '../../src/core/EventBus';

export interface DeviceSensors {
  accelerometer: { x: number; y: number; z: number } | null;
  gyroscope: { x: number; y: number; z: number } | null;
  barometer: number | null;
  proximity: number | null;
  lightLevel: number | null;
  audioLevel: number;
  weatherCondition: 'clear' | 'rain' | 'storm' | 'unknown';
  stepCount: number;
  deviceBattery: number | null;
  isBatteryLow: boolean;
  isCharging: boolean;
  isCameraReady: boolean;
  isMicrophoneReady: boolean;
  hasUserPermission: boolean;
  faceDetected: boolean;
  faceBounds: { x: number; y: number; width: number; height: number } | null;
  userWalking: boolean;
  userRunning: boolean;
  userStationary: boolean;
  isNightTime: boolean;
  isQuietTime: boolean;
}

const finite = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const clamp01 = (value: unknown, fallback = 0): number => Math.max(0, Math.min(1, finite(value, fallback)));

export class DevicePresenceEngine {
  private sensors: DeviceSensors = {
    accelerometer: null,
    gyroscope: null,
    barometer: null,
    proximity: null,
    lightLevel: null,
    audioLevel: 0,
    weatherCondition: 'unknown',
    stepCount: 0,
    deviceBattery: 1,
    isBatteryLow: false,
    isCharging: false,
    isCameraReady: false,
    isMicrophoneReady: false,
    hasUserPermission: false,
    faceDetected: false,
    faceBounds: null,
    userWalking: false,
    userRunning: false,
    userStationary: true,
    isNightTime: false,
    isQuietTime: false,
  };
  private _isActive = false;

  get isActive(): boolean { return this._isActive; }
  start(): void { this._isActive = true; }
  stop(): void { this._isActive = false; }

  setUserPermission(granted: boolean): void { this.sensors.hasUserPermission = !!granted; }
  updateBattery(level: number): void {
    const normalized = clamp01(level, this.sensors.deviceBattery ?? 1);
    const wasLow = this.sensors.isBatteryLow;
    this.sensors.deviceBattery = normalized;
    this.sensors.isBatteryLow = normalized <= 0.2;
    if (this.sensors.isBatteryLow && !wasLow) EventBus.emit('DEVICE_BATTERY_LOW', { level: normalized });
  }
  updateCharging(charging: boolean): void { this.sensors.isCharging = !!charging; }

  updateAccelerometer(x: number, y: number, z: number): void {
    this.sensors.accelerometer = { x: finite(x), y: finite(y), z: finite(z) };
  }
  updateGyroscope(x: number, y: number, z: number): void {
    this.sensors.gyroscope = { x: finite(x), y: finite(y), z: finite(z) };
  }
  updateBarometer(pressure: number): void {
    const p = finite(pressure, 1013);
    this.sensors.barometer = p;
    this.sensors.weatherCondition = p < 990 ? 'storm' : p < 1010 ? 'rain' : 'clear';
  }
  updateLightLevel(illuminance: number): void {
    const lux = Math.max(0, finite(illuminance));
    this.sensors.lightLevel = lux;
    this.sensors.isNightTime = lux < 10;
    this.sensors.isQuietTime = this.sensors.isNightTime;
  }
  updateAudioLevel(level: number): void { this.sensors.audioLevel = clamp01(level, this.sensors.audioLevel); }
  updateStepCount(steps: number): void { this.sensors.stepCount = Math.max(0, Math.round(finite(steps))); }
  updateMovementState(walking: boolean, running: boolean): void {
    this.sensors.userWalking = !!walking;
    this.sensors.userRunning = !!running;
    this.sensors.userStationary = !walking && !running;
  }
  updateFaceDetected(bounds: { x: number; y: number; width: number; height: number } | null): void {
    this.sensors.faceDetected = !!bounds;
    this.sensors.faceBounds = bounds ?? null;
  }
  updateNightTime(isNight: boolean): void {
    this.sensors.isNightTime = !!isNight;
    this.sensors.isQuietTime = !!isNight;
  }
  setCameraReady(ready: boolean): void { this.sensors.isCameraReady = !!ready; }
  setMicrophoneReady(ready: boolean): void { this.sensors.isMicrophoneReady = !!ready; }

  getSensors(): DeviceSensors {
    return {
      ...this.sensors,
      accelerometer: this.sensors.accelerometer ? { ...this.sensors.accelerometer } : null,
      gyroscope: this.sensors.gyroscope ? { ...this.sensors.gyroscope } : null,
      faceBounds: this.sensors.faceBounds ? { ...this.sensors.faceBounds } : null,
    };
  }
}

export const devicePresenceEngine = new DevicePresenceEngine();
