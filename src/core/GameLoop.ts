export type TickCallback = (deltaSec: number) => void;

export class GameLoop {
  private intervalId: number | null = null;
  private lastTimestamp: number = 0;
  private running: boolean = false;
  private targetFps: number;
  private tickIntervalMs: number;
  private speedMultiplier: number = 1.0;
  private tickCallbacks: Set<TickCallback> = new Set();

  constructor(targetFps: number = 10) {
    this.targetFps = targetFps;
    this.tickIntervalMs = Math.floor(1000 / targetFps);
  }

  public setSpeedMultiplier(mult: number): void {
    this.speedMultiplier = Math.max(0, mult);
  }

  public getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  public onTick(cb: TickCallback): () => void {
    this.tickCallbacks.add(cb);
    return () => this.tickCallbacks.delete(cb);
  }

  public isRunning(): boolean {
    return this.running;
  }

  public getTargetFps(): number {
    return this.targetFps;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();

    this.intervalId = window.setInterval(() => {
      const now = performance.now();
      // Cap raw deltaSec to avoid huge simulation jumps on background lag
      const rawDeltaSec = Math.min(1.0, Math.max(0.001, (now - this.lastTimestamp) / 1000));
      this.lastTimestamp = now;

      if (this.speedMultiplier === 0) return;

      const deltaSec = rawDeltaSec * this.speedMultiplier;

      for (const cb of this.tickCallbacks) {
        try {
          cb(deltaSec);
        } catch (err) {
          console.error('Erro no callback do GameLoop:', err);
        }
      }
    }, this.tickIntervalMs);
  }

  public stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public pause(): void {
    this.stop();
  }

  public resume(): void {
    if (!this.running) {
      this.lastTimestamp = performance.now();
      this.start();
    }
  }
}
