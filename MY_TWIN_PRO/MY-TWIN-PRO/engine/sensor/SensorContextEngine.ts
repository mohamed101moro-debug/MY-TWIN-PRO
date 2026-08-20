import { stateBus } from '../../src/core/StateBus';
import { devicePresenceEngine } from '../device/DevicePresenceEngine';
import { unifiedBrainBridge } from '../../src/core/UnifiedBrainBridge';

export interface SensorContext {
  userActivity: 'walking' | 'running' | 'stationary' | 'vehicle' | 'elevator' | 'airplane';
  environment: 'indoor' | 'outdoor' | 'vehicle' | 'high_altitude';
  devicePosition: 'hand' | 'table' | 'pocket' | 'unknown';
  userAttention: 'looking' | 'not_looking' | 'intermittent';
  batteryStatus: 'full' | 'normal' | 'low' | 'critical';
  timeContext: 'morning' | 'afternoon' | 'evening' | 'night' | 'late_night';
  stepCount: number;
  lastActivityChange: number;
  contextualSummary: string;
}

export class SensorContextEngine {
  private context: SensorContext = {
    userActivity: 'stationary',
    environment: 'indoor',
    devicePosition: 'unknown',
    userAttention: 'not_looking',
    batteryStatus: 'normal',
    timeContext: 'morning',
    stepCount: 0,
    lastActivityChange: Date.now(),
    contextualSummary: '',
  };

  private activityHistory: string[] = [];
private lastStoreTs = 0;
  private maxHistoryLength = 20;

  evaluate(): SensorContext {
    const sensors = devicePresenceEngine.getSensors();
    const now = Date.now();
    const hour = new Date().getHours();

    // 1. userActivity — من Accelerometer
    if (sensors.userRunning) {
      this.updateActivity('running');
    } else if (sensors.userWalking) {
      this.updateActivity('walking');
    } else {
      this.updateActivity('stationary');
    }

    // 2. environment — من Barometer + وقت
    if (sensors.barometer && sensors.barometer < 900) {
      this.context.environment = 'high_altitude';
    } else if (sensors.userWalking && this.context.userActivity === 'walking') {
      this.context.environment = 'outdoor';
    } else {
      this.context.environment = 'indoor';
    }

    // 3. devicePosition — من Proximity + Accelerometer
    if (sensors.proximity && sensors.proximity < 3 && !sensors.userWalking) {
      this.context.devicePosition = 'hand';
    } else if (sensors.proximity && sensors.proximity > 10 && sensors.userStationary) {
      this.context.devicePosition = 'table';
    } else if (sensors.userWalking) {
      this.context.devicePosition = 'pocket';
    } else {
      this.context.devicePosition = 'unknown';
    }

    // 4. userAttention — من Face Detection
    if (sensors.faceDetected) {
      this.context.userAttention = 'looking';
    } else {
      this.context.userAttention = 'not_looking';
    }

    // 5. batteryStatus
    if (sensors.deviceBattery && sensors.deviceBattery < 5) {
      this.context.batteryStatus = 'critical';
    } else if (sensors.deviceBattery && sensors.deviceBattery < 15) {
      this.context.batteryStatus = 'low';
    } else if (sensors.deviceBattery && sensors.deviceBattery > 80) {
      this.context.batteryStatus = 'full';
    } else {
      this.context.batteryStatus = 'normal';
    }

    // 6. timeContext
    if (hour >= 6 && hour < 12) this.context.timeContext = 'morning';
    else if (hour >= 12 && hour < 18) this.context.timeContext = 'afternoon';
    else if (hour >= 18 && hour < 22) this.context.timeContext = 'evening';
    else if (hour >= 22 || hour < 5) this.context.timeContext = 'night';
    else this.context.timeContext = 'late_night';

    // 7. stepCount
    this.context.stepCount = devicePresenceEngine.getSensors().stepCount || 0;

    // 8. contextualSummary
    this.context.contextualSummary = this.buildContextualSummary();

    // إرسال إلى الذاكرة (لتُستخدم في المحادثة)
    this.storeInMemory();

    stateBus.emit('sensor:context_evaluated', this.context);
    return this.context;
  }

  private updateActivity(activity: string): void {
    if (this.context.userActivity !== activity) {
      this.context.lastActivityChange = Date.now();
      this.context.userActivity = activity as SensorContext['userActivity'];
      this.activityHistory.push(`${activity}@${new Date().toISOString()}`);
      if (this.activityHistory.length > this.maxHistoryLength) {
        this.activityHistory = this.activityHistory.slice(-this.maxHistoryLength);
      }
    }
  }

  private buildContextualSummary(): string {
    const parts: string[] = [];
    if (this.context.userActivity !== 'stationary') {
      parts.push(`user is ${this.context.userActivity}`);
    }
    if (this.context.devicePosition === 'table') {
      parts.push('phone on table');
    }
    if (this.context.userAttention === 'looking') {
      parts.push('user looking at screen');
    }
    if (this.context.batteryStatus === 'low') {
      parts.push('device battery low');
    }
    return parts.join(', ') || 'idle';
  }

  private async storeInMemory(): Promise<void> {
    // تخزين في الذاكرة كل 5 دقائق فقط (لتجنب الإغراق)
    if (Date.now() - this.lastStoreTs > 300000) {
      this.lastStoreTs = Date.now();
      try {
        await unifiedBrainBridge.storeMemory(
          'sensor_context',
          this.context.contextualSummary,
          30,
          'neutral',
          ['sensor', this.context.userActivity]
        );
      } catch (e) {}
    }
  }

  getContext(): SensorContext { return { ...this.context }; }
  getActivityHistory(): string[] { return [...this.activityHistory]; }

  // يُستدعى من useTwinBrain قبل إرسال الرسالة
  enrichMessage(message: string): string {
    const summary = this.buildContextualSummary();
    if (summary && summary !== 'idle') {
      return `[SENSOR_CONTEXT: ${summary}] ${message}`;
    }
    return message;
  }
}

export const sensorContextEngine = new SensorContextEngine();
