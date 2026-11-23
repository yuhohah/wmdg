import { afterEach, describe, expect, it, vi } from 'vitest';
import { isShippedAsset } from '../../../config/shippedAssets.js';
import {
  BLESSING_DURATION,
  PRAYER_DURATION,
  PRAYER_SEQUENCE_DURATION,
  RISE_FRAME_SEC,
  followerAnimationFrame,
  isFollowerActionMirrored,
  resolveWalkDirection,
} from '../../followers/followerVisuals.js';
import { selectIncarnationWalkSheet, type IncarnationSprite } from '../../incarnation/incarnationSprites.js';
import {
  BOSS_SRC_H,
  BOSS_SRC_W,
  bossLoopFrameCount,
  loadBossSprites,
  resolveBossRenderFrame,
} from './BossSprites.js';

function fakeImage(frames = 1, frameWidth = BOSS_SRC_W, frameHeight = BOSS_SRC_H, loaded = true): HTMLImageElement {
  return {
    complete: loaded,
    naturalWidth: loaded ? frames * frameWidth : 0,
    naturalHeight: loaded ? frameHeight : 0,
    src: '',
    addEventListener: vi.fn(),
  } as unknown as HTMLImageElement;
}

describe('shippedAssets sprite whitelist', () => {
  it('ships all newly generated Incarnation, Follower, and Boss spritesheets', () => {
    const expectedShipped = [
      // Encarnação (5 stages x 5 actions)
      'assets/sprites/encarnacao/01-neofito/idle/spritesheet.png',
      'assets/sprites/encarnacao/02-consagrado/canalizar/spritesheet.png',
      'assets/sprites/encarnacao/03-ancestral/andar/spritesheet.png',
      'assets/sprites/encarnacao/04-eclipse/andar-lateral/spritesheet.png',
      'assets/sprites/encarnacao/05-solar/andar-costas/spritesheet.png',
      // Fiéis (3 tiers x new actions)
      'assets/sprites/fieis/iniciado/idle/spritesheet.png',
      'assets/sprites/fieis/iniciado/andar-frente/spritesheet.png',
      'assets/sprites/fieis/hierofante/andar-costas/spritesheet.png',
      'assets/sprites/fieis/hierofante/rezar-loop/spritesheet.png',
      'assets/sprites/fieis/pontifice/levantar/spritesheet.png',
      // Bosses (idle, dano, reverencia)
      'assets/sprites/bosses/lateral/01-anubis/idle/spritesheet.png',
      'assets/sprites/bosses/lateral/02-hades/dano/spritesheet.png',
      'assets/sprites/bosses/lateral/03-odin/reverencia/spritesheet.png',
      'assets/sprites/bosses/caos-referencia-v2/dano/spritesheet.png',
      'assets/sprites/bosses/caos-referencia-v2/reverencia/spritesheet.png',
      'assets/sprites/bosses/lateral/05-demiurgo/dano/spritesheet.png',
      'assets/sprites/bosses/lateral/05-demiurgo/reverencia/spritesheet.png',
    ];

    for (const relPath of expectedShipped) {
      expect(isShippedAsset(relPath), relPath).toBe(true);
    }
  });
});

describe('follower animation state machine', () => {
  it('resolves 4-directional walks with diagonal hysteresis and safe mirroring', () => {
    expect(resolveWalkDirection(10, 1, 'down')).toBe('side');
    expect(resolveWalkDirection(1, 10, 'side')).toBe('down');
    expect(resolveWalkDirection(1, -10, 'side')).toBe('up');
    // Inside the 1.15 diagonal deadband, keeps previous direction to avoid flicker
    expect(resolveWalkDirection(10, 10, 'up')).toBe('up');
    expect(resolveWalkDirection(10, 10, 'side')).toBe('side');

    expect(isFollowerActionMirrored('andar')).toBe(true);
    expect(isFollowerActionMirrored('idle')).toBe(true);
    expect(isFollowerActionMirrored('rezar')).toBe(true);
    expect(isFollowerActionMirrored('andar-frente')).toBe(false);
    expect(isFollowerActionMirrored('andar-costas')).toBe(false);
  });

  it('cycles idle, directional walk, kneel -> pray-loop, blessing -> rise, and explicit rise', () => {
    expect(followerAnimationFrame('idle', 0, 0, false, 11)).toEqual({ action: 'idle', frame: 3 });
    expect(followerAnimationFrame('walk', 9, 0, false, 0, 'down')).toEqual({ action: 'andar-frente', frame: 1 });
    expect(followerAnimationFrame('walk', 2, 0, false, 0, 'up')).toEqual({ action: 'andar-costas', frame: 2 });
    expect(followerAnimationFrame('walk', 5, 0, false, 0, 'side')).toEqual({ action: 'andar', frame: 5 });

    // Kneeling phase
    expect(followerAnimationFrame('pray', 0, 0.3, true)).toEqual({ action: 'rezar', frame: 2 });
    // Sustained prayer loop while awaiting miracle
    expect(followerAnimationFrame('pray', 0, PRAYER_DURATION + 0.31, true)).toEqual({
      action: 'rezar-loop',
      frame: 2,
    });
    expect(followerAnimationFrame('pray', 0, PRAYER_DURATION + 6 * 0.15 + 0.01, true)).toEqual({
      action: 'rezar-loop',
      frame: 0,
    });

    // Blessing (iluminacao) followed by standing up (levantar)
    expect(followerAnimationFrame('pray', 0, PRAYER_DURATION + 0.45, false)).toEqual({
      action: 'iluminacao',
      frame: 3,
    });
    expect(followerAnimationFrame('pray', 0, PRAYER_DURATION + BLESSING_DURATION + 0.01, false)).toEqual({
      action: 'levantar',
      frame: 0,
    });
    expect(followerAnimationFrame('pray', 0, PRAYER_SEQUENCE_DURATION + 1, false)).toEqual({
      action: 'levantar',
      frame: 6,
    });

    // Explicit stand-up state (used in boss victory return)
    expect(followerAnimationFrame('rise', 0, RISE_FRAME_SEC * 4 + 0.01)).toEqual({
      action: 'levantar',
      frame: 4,
    });
  });
});

describe('incarnation directional walk selection', () => {
  it('mirrors only lateral walk and falls back cleanly when unloaded', () => {
    const sprite: IncarnationSprite = {
      still: fakeImage(1, 128, 128, true),
      idle: fakeImage(8, 128, 128, true),
      channel: fakeImage(8, 128, 128, true),
      walkDown: fakeImage(8, 128, 128, true),
      walkSide: fakeImage(8, 128, 128, true),
      walkUp: fakeImage(8, 128, 128, true),
    };

    expect(selectIncarnationWalkSheet(sprite, 'side')).toEqual({ sheet: sprite.walkSide, mirror: true });
    expect(selectIncarnationWalkSheet(sprite, 'up')).toEqual({ sheet: sprite.walkUp, mirror: false });
    expect(selectIncarnationWalkSheet(sprite, 'down')).toEqual({ sheet: sprite.walkDown, mirror: false });

    const unloaded: IncarnationSprite = {
      ...sprite,
      walkSide: fakeImage(8, 128, 128, false),
      walkUp: fakeImage(8, 128, 128, false),
      walkDown: fakeImage(8, 128, 128, false),
    };
    expect(selectIncarnationWalkSheet(unloaded, 'side')).toEqual({ sheet: sprite.still, mirror: false });
  });
});

describe('boss idleLoop and hurt integration', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('drops the duplicate closing frame on 9-frame and 17-frame loop sheets', () => {
    expect(bossLoopFrameCount(fakeImage(9))).toBe(8);
    expect(bossLoopFrameCount(fakeImage(17))).toBe(16);
    expect(bossLoopFrameCount(fakeImage(13))).toBe(13);
  });

  it('uses idleLoop when idle, plays hurt recoil with stable hitbox, and never interrupts an active attack swing', () => {
    vi.stubGlobal('Image', class MockImage {
      complete = true;
      naturalWidth = 9 * BOSS_SRC_W;
      naturalHeight = BOSS_SRC_H;
      src = '';
      addEventListener = vi.fn();
    });

    const sprites = loadBossSprites('boss_anubis')!;
    expect(sprites.idleLoop).toBeDefined();
    expect(sprites.hurt).toBeDefined();
    expect(sprites.reverence).toBeDefined();

    // Force realistic frame counts for each sheet
    Object.defineProperty(sprites.idle, 'naturalWidth', { value: BOSS_SRC_W, configurable: true });
    Object.defineProperty(sprites.idleLoop!, 'naturalWidth', { value: 9 * BOSS_SRC_W, configurable: true });
    Object.defineProperty(sprites.hurt, 'naturalWidth', { value: 9 * BOSS_SRC_W, configurable: true });
    Object.defineProperty(sprites.attacks[0], 'naturalWidth', { value: 17 * BOSS_SRC_W, configurable: true });

    const idleFrame = resolveBossRenderFrame({
      bossId: 'boss_anubis',
      bossX: 1415,
      bossY: 865,
      stageOriginX: 80,
      stageOriginY: 0,
      bossState: 'idle',
      bossWalkTimeSec: 0,
      bossIdleTimeSec: 0.14 * 3 + 0.01,
      bossAttackIndex: 0,
      bossAttackFrameTimeSec: 0,
    });
    expect(idleFrame.sheet).toBe(sprites.idleLoop);
    expect(idleFrame.frame).toBe(3);

    const hurtFrame = resolveBossRenderFrame({
      bossId: 'boss_anubis',
      bossX: 1415,
      bossY: 865,
      stageOriginX: 80,
      stageOriginY: 0,
      bossState: 'idle',
      bossWalkTimeSec: 0,
      bossIdleTimeSec: 0,
      bossHurtTimeSec: 0.325,
      bossHurtDurationSec: 0.65,
      bossAttackIndex: 0,
      bossAttackFrameTimeSec: 0,
    });
    expect(hurtFrame.sheet).toBe(sprites.hurt);
    expect(hurtFrame.frame).toBe(4);
    expect(hurtFrame.hitLeft).toBe(idleFrame.hitLeft);
    expect(hurtFrame.hitWidth).toBe(idleFrame.hitWidth);

    // Active attack swings must not be interrupted by hurt recoil
    const attackingFrame = resolveBossRenderFrame({
      bossId: 'boss_anubis',
      bossX: 1415,
      bossY: 865,
      stageOriginX: 80,
      stageOriginY: 0,
      bossState: 'attacking',
      bossWalkTimeSec: 0,
      bossHurtTimeSec: 0.1,
      bossHurtDurationSec: 0.65,
      bossAttackIndex: 0,
      bossAttackFrameTimeSec: 0.4,
    });
    expect(attackingFrame.sheet).toBe(sprites.attacks[0]);
  });
});
