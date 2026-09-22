export interface AudioPreferences {
  volume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

export class AudioManager {
  private audioCtx: AudioContext | null = null;
  private bgMusic: HTMLAudioElement | null = null;
  private volume: number = 0.7; // default 70% volume
  private musicEnabled: boolean = true;
  private sfxEnabled: boolean = true;
  private static readonly PREF_KEY = 'cult_audio_preferences';

  constructor() {
    this.loadPreferences();
    this.initMusic();
  }

  private loadPreferences(): void {
    try {
      const raw = localStorage.getItem(AudioManager.PREF_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AudioPreferences>;
        if (typeof parsed.volume === 'number' && !isNaN(parsed.volume)) {
          this.volume = Math.max(0, Math.min(1, parsed.volume));
        }
        if (typeof parsed.musicEnabled === 'boolean') {
          this.musicEnabled = parsed.musicEnabled;
        }
        if (typeof parsed.sfxEnabled === 'boolean') {
          this.sfxEnabled = parsed.sfxEnabled;
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private savePreferences(): void {
    try {
      const prefs: AudioPreferences = {
        volume: this.volume,
        musicEnabled: this.musicEnabled,
        sfxEnabled: this.sfxEnabled,
      };
      localStorage.setItem(AudioManager.PREF_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore localStorage errors
    }
  }

  public init(): void {
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    this.initMusic();
  }

  public initMusic(src: string = '/assets/soundtrack.mpeg'): void {
    if (!this.bgMusic) {
      this.bgMusic = new Audio(src);
      this.bgMusic.loop = true;
      this.bgMusic.preload = 'auto';
      this.bgMusic.volume = this.musicEnabled ? this.volume : 0;
    }
  }

  public playMusic(): void {
    this.init();
    if (!this.bgMusic) return;

    if (!this.musicEnabled) {
      this.bgMusic.pause();
      return;
    }

    this.bgMusic.volume = this.volume;
    if (this.bgMusic.paused) {
      const playPromise = this.bgMusic.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay policy prevented immediate playback; will play on next user gesture
        });
      }
    }
  }

  public pauseMusic(): void {
    if (this.bgMusic && !this.bgMusic.paused) {
      this.bgMusic.pause();
    }
  }

  public toggleMusic(): boolean {
    this.setMusicEnabled(!this.musicEnabled);
    return this.musicEnabled;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    this.savePreferences();
    if (this.bgMusic) {
      if (enabled) {
        this.bgMusic.volume = this.volume;
        if (this.bgMusic.paused) {
          this.bgMusic.play().catch(() => {});
        }
      } else {
        this.bgMusic.pause();
      }
    }
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    this.savePreferences();
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    this.savePreferences();
    if (this.bgMusic) {
      this.bgMusic.volume = this.musicEnabled ? this.volume : 0;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.1): void {
    if (!this.sfxEnabled) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      const sfxVol = Math.max(0.005, this.volume * 0.18);
      gain.gain.setValueAtTime(sfxVol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // Safety catch for audio autoplay policies
    }
  }

  public playChime(): void {
    if (!this.sfxEnabled) return;
    this.playTone(523.25, 'sine', 0.15);
    setTimeout(() => this.playTone(659.25, 'sine', 0.18), 80);
    setTimeout(() => this.playTone(783.99, 'sine', 0.25), 160);
  }
}
