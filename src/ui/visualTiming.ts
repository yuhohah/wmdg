export const VISUAL_FPS = 30;
export type VisualFpsMode = 30 | 60;

const FPS_STORAGE_KEY = 'cult_visual_fps';
const JITTER_TOLERANCE_MS = 3.5;

function readInitialFps(): VisualFpsMode {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(FPS_STORAGE_KEY) === '60') {
      return 60;
    }
  } catch {
    // Default to 30 FPS when storage is unavailable.
  }
  return 30;
}

function syncDocumentFpsAttr(fps: VisualFpsMode): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.fps = String(fps);
  }
}

let currentVisualFps: VisualFpsMode = readInitialFps();
syncDocumentFpsAttr(currentVisualFps);

export function getVisualFps(): VisualFpsMode {
  return currentVisualFps;
}

export function setVisualFps(fps: VisualFpsMode): void {
  const normalized: VisualFpsMode = fps === 60 ? 60 : 30;
  currentVisualFps = normalized;
  syncDocumentFpsAttr(normalized);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FPS_STORAGE_KEY, String(normalized));
    }
  } catch {
    // Session preference still applies in memory.
  }
}

/** Gates off-screen work to 10 Hz while preserving elapsed time on any refresh rate. */
const OFF_SCREEN_TICK_MS = 100;

/**
 * Queues the next frame of a decorative loop and returns how to cancel it.
 * Off screen there is nothing to draw, so a slow timer keeps gameplay timers moving
 * without keeping the display pipeline awake at 60 Hz.
 */
export function scheduleVisualFrame(onScreen: boolean, frame: (nowMs: number) => void): () => void {
  if (onScreen) {
    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }
  const id = setTimeout(() => frame(performance.now()), OFF_SCREEN_TICK_MS);
  return () => clearTimeout(id);
}

export class VisualFrameClock {
  private nextFrameMs: number | undefined;
  private previousFrameMs = 0;
  private activeFps: VisualFpsMode = currentVisualFps;

  public reset(): void {
    this.nextFrameMs = undefined;
    this.previousFrameMs = 0;
    this.activeFps = currentVisualFps;
  }

  public tick(nowMs: number): number | null {
    const fps = currentVisualFps;
    const frameMs = 1000 / fps;
    if (this.nextFrameMs === undefined) {
      this.activeFps = fps;
      this.previousFrameMs = nowMs;
      this.nextFrameMs = nowMs + frameMs;
      return 0;
    }
    if (this.activeFps !== fps) {
      this.activeFps = fps;
      this.nextFrameMs = this.previousFrameMs + frameMs;
    }
    if (nowMs + JITTER_TOLERANCE_MS < this.nextFrameMs) return null;
    const elapsed = Math.max(0, (nowMs - this.previousFrameMs) / 1000);
    this.previousFrameMs = nowMs;
    // Skip missed visual frames instead of drawing a backlog after a stall.
    const steps = Math.max(1, Math.floor((nowMs + JITTER_TOLERANCE_MS - this.nextFrameMs) / frameMs) + 1);
    this.nextFrameMs += steps * frameMs;
    return elapsed;
  }
}

/** Existing motion constants were authored per frame at 60 Hz. */
export function visualFrameScale(elapsedSec: number): number {
  return Math.max(0, Math.min(0.1, elapsedSec)) * 60;
}

/** Quantize compositor effects at 30 FPS, or run smooth easing at 60 FPS. */
export function effectEasing(durationMs: number): string {
  if (currentVisualFps === 60) {
    return 'cubic-bezier(0.22, 1, 0.36, 1)';
  }
  return `steps(${Math.max(1, Math.floor((durationMs * 30) / 1000))}, end)`;
}
