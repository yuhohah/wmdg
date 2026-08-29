export type TickCallback = (dt: number) => void;

export class GameLoop {
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private onTickCallback: TickCallback;
  private timeScale: number = 1.0;

  // Maximum delta step allowed per frame to prevent physics / math explosions (250ms)
  private maxDelta: number = 0.25;

  constructor(onTick: TickCallback) {
    this.onTickCallback = onTick;
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  public setTimeScale(scale: number): void {
    this.timeScale = Math.max(1, Math.min(10, scale));
  }

  public getTimeScale(): number {
    return this.timeScale;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.loop = this.loop.bind(this);
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private loop(currentTime: number): void {
    if (!this.isRunning) return;

    let deltaMs = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Convert to seconds and apply time acceleration
    let dt = (deltaMs / 1000) * this.timeScale;

    // Clamp dt to avoid huge step when browser freezes
    const maxAllowed = this.maxDelta * this.timeScale;
    if (dt > maxAllowed) {
      dt = maxAllowed;
    }

    if (dt > 0) {
      this.onTickCallback(dt);
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Backgrounded
    } else {
      // Returned from background - reset lastTime to avoid huge single dt jump
      this.lastTime = performance.now();
    }
  }
}
