/**
 * S6V.10 — presentation-only runtime performance monitor.
 *
 * It observes renderer timing; it never changes canonical entity state.
 * Consumers may use the snapshot for diagnostics/telemetry after privacy policy
 * approval. No network transmission is performed here.
 */
export interface VisualPerformanceSnapshot {
  frameCount: number;
  droppedFrameEstimate: number;
  averageFrameMs: number;
  worstFrameMs: number;
  startedAt: number;
}

export class VisualPerformanceMonitor {
  private startedAt = 0;
  private frameCount = 0;
  private droppedFrameEstimate = 0;
  private totalFrameMs = 0;
  private worstFrameMs = 0;
  private lastFrameAt = 0;

  start(now = Date.now()): void {
    if (this.startedAt) return;
    this.startedAt = now;
    this.lastFrameAt = now;
  }

  recordFrame(now = Date.now()): void {
    if (!this.startedAt) this.start(now);
    const delta = Math.max(0, now - this.lastFrameAt);
    this.lastFrameAt = now;
    if (delta > 50) this.droppedFrameEstimate += Math.max(0, Math.round(delta / 16.67) - 1);
    this.frameCount += 1;
    this.totalFrameMs += delta;
    this.worstFrameMs = Math.max(this.worstFrameMs, delta);
  }

  snapshot(): VisualPerformanceSnapshot {
    return {
      frameCount: this.frameCount,
      droppedFrameEstimate: this.droppedFrameEstimate,
      averageFrameMs: this.frameCount ? this.totalFrameMs / this.frameCount : 0,
      worstFrameMs: this.worstFrameMs,
      startedAt: this.startedAt,
    };
  }

  reset(): void {
    this.startedAt = 0;
    this.frameCount = 0;
    this.droppedFrameEstimate = 0;
    this.totalFrameMs = 0;
    this.worstFrameMs = 0;
    this.lastFrameAt = 0;
  }
}

export const visualPerformanceMonitor = new VisualPerformanceMonitor();
