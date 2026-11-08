export const VISUAL_FPS = 30;
const FRAME_MS = 1000 / VISUAL_FPS;

/** Gates visual work to 30 Hz while preserving elapsed time on any refresh rate. */
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

  public tick(nowMs: number): number | null {
    if (this.nextFrameMs === undefined) {
      this.previousFrameMs = nowMs;
      this.nextFrameMs = nowMs + FRAME_MS;
      return 0;
    }
    if (nowMs + 0.001 < this.nextFrameMs) return null;
    const elapsed = Math.max(0, (nowMs - this.previousFrameMs) / 1000);
    this.previousFrameMs = nowMs;
    // Skip missed visual frames instead of drawing a backlog after a stall.
    this.nextFrameMs += Math.max(1, Math.floor((nowMs - this.nextFrameMs + 0.001) / FRAME_MS) + 1) * FRAME_MS;
    return elapsed;
  }
}

/** Existing motion constants were authored per frame at 60 Hz. */
export function visualFrameScale(elapsedSec: number): number {
  return Math.max(0, Math.min(0.1, elapsedSec)) * 60;
}

/** Quantize compositor effects without moving their animation loop into JavaScript. */
export function effectEasing(durationMs: number): string {
  return `steps(${Math.max(1, Math.floor(durationMs * VISUAL_FPS / 1000))}, end)`;
}
