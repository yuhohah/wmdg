export class AudioManager {
  private audioCtx: AudioContext | null = null;

  public init(): void {
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
  }

  public playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.1): void {
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // Safety catch for audio autoplay policies
    }
  }

  public playChime(): void {
    this.playTone(523.25, 'sine', 0.15);
    setTimeout(() => this.playTone(659.25, 'sine', 0.18), 80);
    setTimeout(() => this.playTone(783.99, 'sine', 0.25), 160);
  }
}
