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
