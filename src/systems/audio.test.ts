import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager, BACKGROUND_MUSIC_SRC, BOSS_BATTLE_MUSIC_SRC } from './audio';

class MockAudio {
  public static instances: MockAudio[] = [];
  public src: string;
  public loop = false;
  public preload = 'none';
  public volume = 1;
  public currentTime = 0;
  public paused = true;

  public play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });

  public pause = vi.fn(() => {
    this.paused = true;
  });

  constructor(src: string) {
    this.src = src;
    MockAudio.instances.push(this);
  }
}

describe('AudioManager sound effects volume', () => {
  const PREF_KEY = 'cult_audio_preferences';
  let store: Map<string, string>;
  let gains: number[];

  beforeEach(() => {
    gains = [];
    store = new Map<string, string>();
    MockAudio.instances = [];
    vi.stubGlobal('Audio', MockAudio);
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    });
    class MockAudioContext {
      public currentTime = 0;
      public state = 'running';
      public destination = {};
      createOscillator() {
        return { type: 'sine', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      }
      createGain() {
        return {
          gain: { setValueAtTime: (v: number) => gains.push(v), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
        };
      }
    }
    vi.stubGlobal('window', { AudioContext: MockAudioContext });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the current loudness by default', () => {
    const audio = new AudioManager();
    audio.setVolume(0.5);
    audio.playTone(440);
    expect(gains[0]).toBeCloseTo(0.09);
  });

  it('scales effects by both the effects and the general volume', () => {
    const audio = new AudioManager();
    audio.setVolume(0.5);
    audio.setSfxVolume(0.5);
    audio.playTone(440);
    expect(gains[0]).toBeCloseTo(0.045);
  });

  it('leaves the music volume alone', () => {
    const audio = new AudioManager();
    audio.setVolume(0.6);
    audio.setSfxVolume(0.1);
    expect(MockAudio.instances[0].volume).toBeCloseTo(0.6);
    expect(MockAudio.instances[1].volume).toBeCloseTo(0.6);
  });

  it('is silent at zero', () => {
    const audio = new AudioManager();
    audio.setSfxVolume(0);
    audio.playTone(440);
    expect(gains).toEqual([]);
  });

  it('remembers the choice and clamps it', () => {
    new AudioManager().setSfxVolume(0.25);
    expect(new AudioManager().getSfxVolume()).toBe(0.25);
    const audio = new AudioManager();
    audio.setSfxVolume(5);
    expect(audio.getSfxVolume()).toBe(1);
  });

  it('accepts preferences saved before this setting existed', () => {
    store.set(PREF_KEY, JSON.stringify({ volume: 0.4, musicEnabled: true, sfxEnabled: true }));
    const audio = new AudioManager();
    expect(audio.getVolume()).toBe(0.4);
    expect(audio.getSfxVolume()).toBe(1);
  });
});

describe('AudioManager background and boss battle soundtrack switching', () => {
  beforeEach(() => {
    MockAudio.instances = [];
    vi.stubGlobal('Audio', MockAudio);
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes background_music.mp3 as default track and boss_battle.mp3 for boss encounters', () => {
    const audio = new AudioManager();
    expect(MockAudio.instances).toHaveLength(2);
    const [bgAudio, bossAudio] = MockAudio.instances;
    expect(bgAudio.src).toBe(BACKGROUND_MUSIC_SRC);
    expect(bgAudio.src).toBe('/assets/background_music.mp3');
    expect(bossAudio.src).toBe(BOSS_BATTLE_MUSIC_SRC);
    expect(bossAudio.src).toBe('/assets/boss_battle.mp3');
    expect(audio.getActiveTrack()).toBe('background');

    audio.playMusic();
    expect(bgAudio.play).toHaveBeenCalledTimes(1);
    expect(bgAudio.paused).toBe(false);
    expect(bossAudio.paused).toBe(true);
  });

  it('switches to boss_battle.mp3 during boss battle and resumes background_music.mp3 when battle ends', () => {
    const audio = new AudioManager();
    const [bgAudio, bossAudio] = MockAudio.instances;

    audio.playMusic();
    bgAudio.currentTime = 42;
    expect(bgAudio.paused).toBe(false);

    audio.playBossBattleMusic();
    expect(audio.getActiveTrack()).toBe('boss');
    expect(bgAudio.pause).toHaveBeenCalled();
    expect(bgAudio.paused).toBe(true);
    expect(bossAudio.currentTime).toBe(0);
    expect(bossAudio.play).toHaveBeenCalledTimes(1);
    expect(bossAudio.paused).toBe(false);

    bossAudio.currentTime = 18;
    audio.stopBossBattleMusic();
    expect(audio.getActiveTrack()).toBe('background');
    expect(bossAudio.pause).toHaveBeenCalled();
    expect(bossAudio.paused).toBe(true);
    expect(bossAudio.currentTime).toBe(0);
    expect(bgAudio.paused).toBe(false);
    expect(bgAudio.currentTime).toBe(42);
  });
});
