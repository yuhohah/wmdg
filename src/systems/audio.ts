export interface AudioPreferences {
  volume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

export type MusicTrackMode = 'background' | 'boss';

export const BACKGROUND_MUSIC_SRC = '/assets/background_music.mp3';
export const BOSS_BATTLE_MUSIC_SRC = '/assets/boss_battle.mp3';

export class AudioManager {
  private audioCtx: AudioContext | null = null;
  private bgMusic: HTMLAudioElement | null = null;
  private bossMusic: HTMLAudioElement | null = null;
  private activeTrack: MusicTrackMode = 'background';
  private volume: number = 0.7; // default 70% volume
  private sfxVolume: number = 1; // relative to the general volume
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
        if (typeof parsed.sfxVolume === 'number' && !isNaN(parsed.sfxVolume)) {
          this.sfxVolume = Math.max(0, Math.min(1, parsed.sfxVolume));
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
        sfxVolume: this.sfxVolume,
        musicEnabled: this.musicEnabled,
        sfxEnabled: this.sfxEnabled,
      };
      localStorage.setItem(AudioManager.PREF_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore localStorage errors
    }
  }

  public init(): void {
    if (!this.audioCtx && typeof window !== 'undefined') {
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

  public initMusic(
    bgSrc: string = BACKGROUND_MUSIC_SRC,
    bossSrc: string = BOSS_BATTLE_MUSIC_SRC
  ): void {
    if (typeof Audio === 'undefined') return;
    if (!this.bgMusic && bgSrc) {
      this.bgMusic = new Audio(bgSrc);
      this.bgMusic.loop = true;
      this.bgMusic.preload = 'auto';
      this.bgMusic.volume = this.musicEnabled ? this.volume : 0;
    }
    if (!this.bossMusic && bossSrc) {
      this.bossMusic = new Audio(bossSrc);
      this.bossMusic.loop = true;
      this.bossMusic.preload = 'auto';
      this.bossMusic.volume = this.musicEnabled ? this.volume : 0;
    }
  }

  private getCurrentAudioElement(): HTMLAudioElement | null {
    return this.activeTrack === 'boss' ? this.bossMusic : this.bgMusic;
  }

  public getActiveTrack(): MusicTrackMode {
    return this.activeTrack;
  }

  public playMusic(): void {
    this.init();
    const current = this.getCurrentAudioElement();
    const other = this.activeTrack === 'boss' ? this.bgMusic : this.bossMusic;

    if (other && !other.paused) {
      other.pause();
    }

    if (!current) return;

    if (!this.musicEnabled) {
      current.pause();
      return;
    }

    current.volume = this.volume;
    if (current.paused) {
      const playPromise = current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay policy prevented immediate playback; will play on next user gesture
        });
      }
    }
  }

  public playBossBattleMusic(): void {
    this.init();
    this.activeTrack = 'boss';
    if (this.bgMusic && !this.bgMusic.paused) {
      this.bgMusic.pause();
    }
    if (this.bossMusic) {
      this.bossMusic.currentTime = 0;
    }
    this.playMusic();
  }

  public stopBossBattleMusic(): void {
    this.activeTrack = 'background';
    if (this.bossMusic) {
      if (!this.bossMusic.paused) {
        this.bossMusic.pause();
      }
      this.bossMusic.currentTime = 0;
    }
    this.playMusic();
  }

  public pauseMusic(): void {
    if (this.bgMusic && !this.bgMusic.paused) {
      this.bgMusic.pause();
    }
    if (this.bossMusic && !this.bossMusic.paused) {
      this.bossMusic.pause();
    }
  }

  public isMusicPaused(): boolean {
    const current = this.getCurrentAudioElement();
    return !current || current.paused;
  }

  public toggleMusic(): boolean {
    this.setMusicEnabled(!this.musicEnabled);
    return this.musicEnabled;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    this.savePreferences();
    if (enabled) {
      this.playMusic();
    } else {
      this.pauseMusic();
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
    const targetVolume = this.musicEnabled ? this.volume : 0;
    if (this.bgMusic) {
      this.bgMusic.volume = targetVolume;
    }
    if (this.bossMusic) {
      this.bossMusic.volume = targetVolume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.savePreferences();
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.1): void {
    const loudness = this.volume * this.sfxVolume * 0.18;
    if (!this.sfxEnabled || loudness <= 0) return;
    this.init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(Math.max(0.005, loudness), this.audioCtx.currentTime);
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
