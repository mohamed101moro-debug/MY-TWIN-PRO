/**
 * PERFORMANCE MONITOR v1.0 — مراقب الأداء
 * ==========================================
 * يتتبع FPS، الذاكرة، وزمن الاستجابة.
 * يصدر تحذيرات عندما يتدهور الأداء.
 * يستخدم في بيئة التطوير فقط.
 */
import { Platform, NativeModules } from 'react-native';

interface PerformanceSnapshot {
  fps: number;
  memoryMB: number;
  lastResponseTime: number;
  timestamp: number;
}

type WarningCallback = (message: string, snapshot: PerformanceSnapshot) => void;

export class PerformanceMonitorClass {
  private frames = 0;
  private lastFpsCheck = 0;
  private currentFps = 60;
  private responseTimes: number[] = [];
  private warnings: WarningCallback[] = [];
  private isRunning = false;
  private rafId: number | null = null;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFpsCheck = Date.now();
    this.trackFrame();
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  recordResponseTime(ms: number): void {
    this.responseTimes.push(ms);
    if (this.responseTimes.length > 50) this.responseTimes.shift();

    if (ms > 3000) {
      this.emitWarning(`استجابة بطيئة: ${ms}ms`, this.snapshot());
    }
  }

  getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return sum / this.responseTimes.length;
  }

  getFPS(): number {
    return this.currentFps;
  }

  onWarning(callback: WarningCallback): () => void {
    this.warnings.push(callback);
    return () => {
      this.warnings = this.warnings.filter(cb => cb !== callback);
    };
  }

  snapshot(): PerformanceSnapshot {
    let memoryMB = 0;
    try {
      if (Platform.OS === 'android' && NativeModules?.MemoryInfo) {
        // Android memory info if available
      }
    } catch (e) {}

    return {
      fps: this.currentFps,
      memoryMB,
      lastResponseTime: this.responseTimes.length > 0
        ? this.responseTimes[this.responseTimes.length - 1]
        : 0,
      timestamp: Date.now(),
    };
  }

  private trackFrame(): void {
    if (!this.isRunning) return;
    this.frames++;
    const now = Date.now();
    const elapsed = now - this.lastFpsCheck;
    if (elapsed >= 1000) {
      this.currentFps = Math.round((this.frames * 1000) / elapsed);
      this.frames = 0;
      this.lastFpsCheck = now;

      if (this.currentFps < 30) {
        this.emitWarning(`FPS منخفض: ${this.currentFps}`, this.snapshot());
      }
    }
    this.rafId = requestAnimationFrame(() => this.trackFrame());
  }

  private emitWarning(message: string, snap: PerformanceSnapshot): void {
    if (__DEV__) {
      console.warn(`[PerformanceMonitor] ${message}`);
    }
    this.warnings.forEach(cb => cb(message, snap));
  }
}

export const performanceMonitor = new PerformanceMonitorClass();
