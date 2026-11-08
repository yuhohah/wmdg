import { afterEach, describe, expect, it, vi } from 'vitest';
import { BossBattleModal, type BattleCameraTarget } from './BossBattleModal.js';
import { GameStateManager } from '../../core/GameState.js';
import type { AudioManager } from '../../systems/audio.js';
import type { NotificationManager } from '../../systems/notifications.js';
import { GNOSE_UPGRADES } from '../../config/gnose.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

interface BoxOverride {
  x: number;
  y: number;
  w: number;
  h: number;
}

function setupBossModalHarness(
  followerCount = 400,
  boxes?: {
    incarnationBox?: BoxOverride;
    followersBox?: BoxOverride;
  }
) {
  let focusedElement: MockElement | null = null;
  const nativeScroll = { left: 0 };
  const cameraFrames: BattleCameraTarget[] = [];
  const drawImageCalls: Array<{
    img: unknown;
    sx: number;
    sy: number;
    sw: number;
    sh: number;
    dx: number;
    dy: number;
    dw: number;
    dh: number;
  }> = [];

  let probeDrawnFrame = 0;
  const probeCtx = {
    clearRect: vi.fn(),
    drawImage: vi.fn((_img: unknown, sx: number) => {
      probeDrawnFrame = Math.round(sx / 256);
    }),
    getImageData: vi.fn(() => {
      const data = new Uint8ClampedArray(256 * 192 * 4);
      const minX = 60 + probeDrawnFrame * 4;
      const maxX = Math.min(250, 150 + probeDrawnFrame * 5);
      const minY = 12 + (probeDrawnFrame % 4) * 3;
      const maxY = 182;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          data[(y * 256 + x) * 4 + 3] = 255;
        }
      }
      return { data };
    }),
  };

  const worldCtx = {
    clearRect: vi.fn(),
    imageSmoothingEnabled: true,
    save: vi.fn(),
    restore: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'center',
    filter: 'none',
    setLineDash: vi.fn(),
    beginPath: vi.fn(),
    ellipse: vi.fn(),
    arc: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(
      (
        img: unknown,
        sx: number,
        sy: number,
        sw: number,
        sh: number,
        dx: number,
        dy: number,
        dw: number,
        dh: number
      ) => {
        drawImageCalls.push({ img, sx, sy, sw, sh, dx, dy, dw, dh });
      }
    ),
  };

  class MockElement {
    public id = '';
    public className = '';
    public title = '';
    public textContent = '';
    public width = 0;
    public height = 0;
    public offsetLeft = 0;
    public offsetTop = 0;
    public offsetWidth = 0;
    public offsetHeight = 0;
    public offsetParent: MockElement | null = null;
    public style = Object.create({
      getPropertyValue(this: Record<string, string>, name: string) { return this[name] ?? ''; },
    }) as Record<string, string>;
    public children: MockElement[] = [];
    public parentElement: MockElement | null = null;
    public isConnected = true;
    private attrs = new Map<string, string>();
    private classes = new Set<string>();
    private listeners = new Map<string, Array<(e: unknown) => void>>();
    private inner = '';

    public classList = {
      add: (c: string) => this.classes.add(c),
      remove: (...names: string[]) => names.forEach(c => this.classes.delete(c)),
      contains: (c: string) => this.classes.has(c),
      toggle: (c: string, force?: boolean) => {
        const shouldAdd = force ?? !this.classes.has(c);
        if (shouldAdd) this.classes.add(c);
        else this.classes.delete(c);
        return shouldAdd;
      },
    };

    set innerHTML(val: string) {
      this.inner = val;
      this.children = [];
      if (val.includes('boss-arena-attack-btn')) {
        const mk = (id: string, cls = '') => {
          const el = new MockElement();
          el.id = id;
          el.className = cls;
          el.parentElement = this;
          this.children.push(el);
          return el;
        };
        mk('boss-world-canvas', 'boss-world-canvas');
        mk('boss-arena-attack-btn', 'boss-attack-target boss-world-hitbox');
        mk('boss-world-hp-plate', 'boss-world-hp-plate');
        mk('sphere-world-hp-plate', 'sphere-world-hp-plate');
        mk('boss-world-hp-label');
        const hpTrack = mk('boss-hp-track');
        const hpFill = mk('boss-hp-fill');
        hpFill.parentElement = hpTrack;
        const altarTrack = mk('boss-altar-track');
        const altarFill = mk('boss-altar-fill');
        altarFill.parentElement = altarTrack;
        mk('boss-hp-val');
        mk('boss-altar-val');
        mk('boss-combat-feedback');
        mk('boss-combat-stats');
        mk('btn-boss-retreat');
        mk('boss-attack-damage');
        mk('boss-rifts-layer');
      }
    }

    get innerHTML(): string {
      return this.inner;
    }

    appendChild(child: MockElement): MockElement {
      child.parentElement = this;
      this.children.push(child);
      return child;
    }

    remove(): void {
      this.isConnected = false;
      if (this.parentElement) {
        this.parentElement.children = this.parentElement.children.filter((c) => c !== this);
      }
    }

    contains(other: unknown): boolean {
      return other === this;
    }

    focus(options?: FocusOptions): void {
      // Browsers scroll an off-screen focused control into view independently of board pan.
      if (focusedElement !== this && !options?.preventScroll) nativeScroll.left = 1126;
      focusedElement = this;
    }

    setAttribute(k: string, v: string): void {
      this.attrs.set(k, v);
    }

    getAttribute(k: string): string | null {
      return this.attrs.get(k) ?? null;
    }

    addEventListener(type: string, cb: (e: unknown) => void): void {
      const list = this.listeners.get(type) ?? [];
      list.push(cb);
      this.listeners.set(type, list);
    }

    dispatchClick(): void {
      (this.listeners.get('click') ?? []).forEach((cb) =>
        cb({ stopPropagation: () => {}, clientX: 500, clientY: 400, detail: 1 })
      );
    }

    getContext(): unknown {
      return this.id === 'boss-world-canvas' ? worldCtx : probeCtx;
    }

    getBoundingClientRect() {
      return { x: 0, y: 0, left: 0, top: 0, width: this.offsetWidth || 100, height: this.offsetHeight || 100 };
    }

    querySelector<T = MockElement>(sel: string): T | null {
      if (sel.startsWith('#')) {
        const targetId = sel.slice(1);
        return (this.children.find((c) => c.id === targetId) as unknown as T) ?? null;
      }
      if (sel.startsWith('[data-rift-id="')) {
        const id = sel.slice('[data-rift-id="'.length, -2);
        return (
          (this.children.find((c) => c.getAttribute('data-rift-id') === id) as unknown as T) ??
          null
        );
      }
      return null;
    }
  }

  const bodyEl = new MockElement();
  const worldEl = new MockElement();
  worldEl.id = 'dodeca-board-world';
  worldEl.offsetWidth = 6880;
  worldEl.offsetHeight = 4200;

  const extraById = new Map<string, MockElement>();
  if (boxes?.incarnationBox) {
    const el = new MockElement();
    el.id = 'incarnation-altar-canvas';
    el.offsetLeft = boxes.incarnationBox.x;
    el.offsetTop = boxes.incarnationBox.y;
    el.offsetWidth = boxes.incarnationBox.w;
    el.offsetHeight = boxes.incarnationBox.h;
    el.offsetParent = worldEl;
    extraById.set(el.id, el);
  }
  if (boxes?.followersBox) {
    const el = new MockElement();
    el.id = 'followers-walk-canvas';
    el.offsetLeft = boxes.followersBox.x;
    el.offsetTop = boxes.followersBox.y;
    el.offsetWidth = boxes.followersBox.w;
    el.offsetHeight = boxes.followersBox.h;
    el.offsetParent = worldEl;
    extraById.set(el.id, el);
  }

  vi.stubGlobal('window', {
    innerWidth: 1280,
    innerHeight: 720,
    matchMedia: () => ({ matches: false }),
  });
  vi.stubGlobal('HTMLElement', MockElement);
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    get activeElement() { return focusedElement; },
    body: bodyEl,
    getElementById: (id: string) => {
      if (id === 'dodeca-board-world') return worldEl;
      return extraById.get(id) ?? null;
    },
    querySelectorAll: (sel: string) => {
      if (sel === '#boss-world-stage') {
        return worldEl.children.filter((c) => c.id === 'boss-world-stage');
      }
      return [];
    },
    createElement: () => new MockElement(),
    addEventListener: vi.fn(),
  });
  vi.stubGlobal(
    'Image',
    class {
      src = '';
      complete = true;
      naturalWidth = 256 * 17;
      naturalHeight = 192;
      addEventListener = vi.fn();
    }
  );
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());

  const gameState = new GameStateManager();
  gameState.totalGnoseEarned = 10;
  gameState.faithPoints = gameState.totalFaithAccumulated = 1e22;
  gameState.fervorPoints = 1e11;
  gameState.fervorUpgrades[0].level = 80;
  gameState.relicPoints = 1e4;
  gameState.relicUpgrades[0].level = 18;
  gameState.incarnationStage = 3;
  gameState.followers[0].count = followerCount;
  gameState.defeatedBosses.add('boss_anubis');
  gameState.unlockedGnoseUpgrades.add('gn_followers_syn');
  gameState.unlockedGnoseUpgrades.add('gn_bencao_eterna');

  const audio = { playTone: vi.fn(), playChime: vi.fn(), playBossBattleMusic: vi.fn(), stopBossBattleMusic: vi.fn() } as unknown as AudioManager;
  const notifications = { showCustomPopup: vi.fn() } as unknown as NotificationManager;

  const modal = new BossBattleModal({
    gameState,
    audio,
    notifications,
    spawnFloatingText: vi.fn(),
    onCameraFrame: target => cameraFrames.push(target),
  });

  return { modal, audio, gameState, worldEl, drawImageCalls, nativeScroll, cameraFrames, notifications, createControl: () => new MockElement() };
}

describe('BossBattleModal ritual gating, Boss descent & continuous sprite hitbox tracking', () => {
  it('follows the incarnation until the full circle is formed, then follows the distant boss before framing combat', () => {
    const { modal, audio, gameState, cameraFrames } = setupBossModalHarness(100);
    modal.openForBoss('boss_cronos');
    expect(audio.playBossBattleMusic).toHaveBeenCalledTimes(1);
    expect(cameraFrames.at(-1)?.phase).toBe('incarnation');
    for (let i = 0; i < 200 && modal.getChoreographySnapshot().bossState === 'awaiting_ritual'; i++) {
      const before = modal.getChoreographySnapshot();
      expect(cameraFrames.at(-1)?.phase).toBe('incarnation');
      expect(cameraFrames.at(-1)?.x).toBe(before.incX);
      modal.stepSceneForTest(0.2);
    }
    const spawn = modal.getChoreographySnapshot();
    expect(spawn.followers.every(f => f.state === 'encircling')).toBe(true);
    expect(cameraFrames.at(-1)?.phase).toBe('boss');
    expect(cameraFrames.at(-1)?.x).toBe(spawn.bossX);
    expect(Math.hypot(spawn.bossX - 1740, spawn.bossY - 854)).toBeGreaterThan(1500);
    const hp = gameState.activeBossBattle!.bossHp;
    gameState.tick(1);
    expect(gameState.activeBossBattle!.bossHp).toBe(hp);
    for (let i = 0; i < 40 && modal.getChoreographySnapshot().bossState === 'walking'; i++) modal.stepSceneForTest(0.2);
    expect(modal.getChoreographySnapshot().combatStarted).toBe(true);
    expect(cameraFrames.at(-1)?.phase).toBe('combat');
    modal.close();
    expect(audio.stopBossBattleMusic).toHaveBeenCalledTimes(1);
  });

  it('keeps a parried swing interrupted even when an earlier missed rift is reported in the same UI update', () => {
    const { modal, gameState, worldEl } = setupBossModalHarness(100);
    expect(modal.openForBoss('boss_cronos')).toBe(true);
    for (let i = 0; i < 200 && modal.getChoreographySnapshot().bossState !== 'idle'; i++) modal.stepSceneForTest(0.2);
    gameState.spawnBossRift();
    gameState.spawnBossRift();
    const battle = gameState.activeBossBattle!;
    battle.activeRifts.forEach(r => { r.remainingSec -= 0.7; });
    modal.updateUI();
    modal.stepSceneForTest(0.05);
    expect(modal.getChoreographySnapshot().bossState).toBe('attacking');
    battle.activeRifts[0].remainingSec = 0;
    gameState.tick(0.02); // Expiry happened, but the UI has not consumed its feedback yet.
    const targets = worldEl.children[0].querySelector('#boss-rifts-layer')!;
    targets.children[1].dispatchClick();
    expect(modal.getChoreographySnapshot().bossState).toBe('idle');
    modal.stepSceneForTest(0.1);
    expect(modal.getChoreographySnapshot().bossState).toBe('idle');
    modal.close();
  });

  it('returns focus after a victory without scrolling the board viewport beyond the camera limits', () => {
    const { modal, gameState, worldEl, nativeScroll, createControl } = setupBossModalHarness();
    const challengeButton = createControl();
    challengeButton.focus({ preventScroll: true });
    expect(modal.openForBoss('boss_cronos')).toBe(true);

    const attackButton = worldEl.children[0].querySelector('#boss-arena-attack-btn')!;
    attackButton.focus({ preventScroll: true });
    const battle = gameState.activeBossBattle!;
    battle.combatStarted = true;
    battle.bossHp = 1;
    battle.sphereCooldownSec = 0;
    gameState.addClick(() => 0.5);

    expect(gameState.isBossDefeated('boss_cronos')).toBe(true);
    expect(modal.isOpen()).toBe(false);
    expect(document.activeElement).toBe(challengeButton);
    expect(nativeScroll.left).toBe(0);
  });

  it('levitates with the approved Chaos art and alternates ranged attacks without making projectiles clickable', () => {
    const { modal, gameState, worldEl, drawImageCalls } = setupBossModalHarness(100);
    GNOSE_UPGRADES.forEach(upgrade => gameState.unlockedGnoseUpgrades.add(upgrade.id));
    expect(modal.openForBoss('boss_tiamat')).toBe(true);

    for (let i = 0; i < 150 && modal.getChoreographySnapshot().bossState !== 'idle'; i++) {
      modal.stepSceneForTest(0.2);
    }
    expect(modal.getChoreographySnapshot().bossState).toBe('idle');
    const lastBossDraw = () => [...drawImageCalls].reverse().find(c => c.sw === 256 && c.sh === 192)!;
    const imageSrc = () => (lastBossDraw().img as { src: string }).src;
    expect(imageSrc()).toContain('/bosses/caos-referencia-v2/andar/spritesheet.png');
    const restingFrame = lastBossDraw().sx;
    modal.stepSceneForTest(0.3);
    expect(lastBossDraw().sx).not.toBe(restingFrame);

    const hitbox = worldEl.children[0].querySelector('#boss-arena-attack-btn')!;
    for (const attack of ['ataque-circulos', 'ataque-esferas']) {
      gameState.activeBossBattle!.activeRifts.length = 0;
      gameState.spawnBossRift();
      gameState.activeBossBattle!.activeRifts[0].remainingSec -= 0.7;
      modal.stepSceneForTest(0.05);
      expect(modal.getChoreographySnapshot().bossState).toBe('attacking');
      expect(imageSrc()).toContain(`/caos-referencia-v2/${attack}/spritesheet.png`);
      const bodyBox = { ...hitbox.style };

      modal.stepSceneForTest(0.45);
      expect(lastBossDraw().sx).toBe(5 * 256); // 90 ms per frame, matching the generated art.
      for (const property of ['left', 'top', 'width', 'height']) {
        expect(hitbox.style[property]).toBe(bodyBox[property]);
      }
      modal.stepSceneForTest(1.1);
      expect(modal.getChoreographySnapshot().bossState).toBe('idle');
      expect(imageSrc()).toContain('/caos-referencia-v2/andar/spritesheet.png');
    }
    modal.close();
  });

  it.each([false, true])('shows numbered APARAR balloons and reports the scale penalty (higher first: %s)', higherFirst => {
    const { modal, gameState, worldEl } = setupBossModalHarness(100);
    expect(modal.openForBoss('boss_anubis', { isRematch: true })).toBe(true);
    gameState.beginBossCombat();
    gameState.spawnBossRift({ forceSpecial: true });
    modal.updateUI();
    const stage = worldEl.children[0];
    const layer = stage.querySelector('#boss-rifts-layer')!;
    const [lower, higher] = [...gameState.activeBossBattle!.activeRifts]
      .sort((a, b) => a.scaleValue! - b.scaleValue!);
    expect(layer.children).toHaveLength(2);
    for (const rift of [lower, higher]) {
      const button = layer.children.find(el => el.getAttribute('data-rift-id') === rift.id)!;
      expect(button.innerHTML).toContain(`<span class="boss-rift-number"><small>PESO</small>${rift.scaleValue}</span>`);
      expect(button.innerHTML).toContain('Clique no maior peso');
      expect(button.innerHTML).toContain('>PESAR</span>');
      expect(button.getAttribute('aria-label')).toContain(String(rift.scaleValue));
    }
    const hp = gameState.activeBossBattle!.bossHp;
    if (higherFirst) {
      layer.children.find(el => el.getAttribute('data-rift-id') === higher.id)!.dispatchClick();
      expect(gameState.activeBossBattle!.altarIntegrity).toBe(100);
      expect(layer.children).toHaveLength(1);
    }
    layer.children.find(el => el.getAttribute('data-rift-id') === lower.id)!.dispatchClick();
    expect(gameState.activeBossBattle!.bossHp).toBe(hp);
    expect(layer.children).toHaveLength(0);
    expect(stage.querySelector('#boss-combat-feedback')!.textContent)
      .toContain(`Peso menor! `);
    expect(stage.querySelector('#boss-combat-feedback')!.textContent)
      .toContain(`(×${higherFirst ? 3 : 2})`);
    modal.close();
  });

  it('reports a parry and keeps only the combo below the Sphere', () => {
    const { modal, gameState, worldEl } = setupBossModalHarness(100);
    expect(modal.openForBoss('boss_anubis', { isRematch: true })).toBe(true);
    gameState.beginBossCombat();
    gameState.spawnBossRift();
    modal.updateUI();
    const stage = worldEl.children[0];
    const stats = stage.querySelector('#boss-combat-stats')!;
    expect(stats.textContent).not.toContain('Combo');
    stage.querySelector('#boss-rifts-layer')!.children[0].dispatchClick();
    expect(stage.querySelector('#boss-combat-feedback')!.textContent).toBe('Aparado! +25% de Fulgor');
    modal.updateUI();
    expect(stats.textContent).toBe('Combo ×1');
    modal.close();
  });

  it('keeps the Boss hidden until the ritual completes, then tracks the Boss sprite silhouette on every frame across descent, idle, attack lunge, and parry', () => {
    const { modal, gameState, worldEl, drawImageCalls } = setupBossModalHarness(100);
    expect(modal.openForBoss('boss_cronos')).toBe(true);

    const stage = worldEl.children[0];
    const attackBtn = stage.querySelector('#boss-arena-attack-btn')!;
    const hpPlate = stage.querySelector('#boss-world-hp-plate')!;
    const riftsLayer = stage.querySelector('#boss-rifts-layer')!;

    // 1. During pre-battle ritual: Boss sprite is NOT drawn and attack hitbox + HP plate stay hidden
    expect(modal.getChoreographySnapshot().bossState).toBe('awaiting_ritual');
    expect(attackBtn.style.display).toBe('none');
    expect(hpPlate.style.display).toBe('none');
    expect(drawImageCalls.some((c) => c.sw === 256 && c.sh === 192)).toBe(false);

    // Advance until the Faithful + Incarnation complete the 360° circle
    for (let i = 0; i < 85; i++) {
      drawImageCalls.length = 0;
      modal.stepSceneForTest(0.2);
      if (modal.getChoreographySnapshot().bossState !== 'awaiting_ritual') break;
    }

    const assertHitboxWrapsLastBossDraw = () => {
      expect(attackBtn.style.display).toBe('');
      expect(hpPlate.style.display).toBe('');
      const bossDraw = [...drawImageCalls].reverse().find((c) => c.sw === 256 && c.sh === 192);
      expect(bossDraw).toBeDefined();
      const frame = Math.round(bossDraw!.sx / 256);
      const minX = 60 + frame * 4;
      const maxX = Math.min(250, 150 + frame * 5);
      const minY = 12 + (frame % 4) * 3;
      const maxY = 182;

      const expectedLeft = Math.floor(bossDraw!.dx + (minX / 256) * bossDraw!.dw - 6);
      const expectedRight = Math.ceil(bossDraw!.dx + ((maxX + 1) / 256) * bossDraw!.dw + 6);
      const expectedTop = Math.floor(bossDraw!.dy + (minY / 192) * bossDraw!.dh - 6);
      const expectedBottom = Math.ceil(bossDraw!.dy + ((maxY + 1) / 192) * bossDraw!.dh + 6);

      expect(attackBtn.style.left).toBe(`${expectedLeft}px`);
      expect(attackBtn.style.top).toBe(`${expectedTop}px`);
      expect(attackBtn.style.width).toBe(`${expectedRight - expectedLeft}px`);
      expect(attackBtn.style.height).toBe(`${expectedBottom - expectedTop}px`);
    };

    // 2. Immediately upon ritual completion (Boss spawns above and begins descending)
    expect(modal.getChoreographySnapshot().bossState).toBe('walking');
    assertHitboxWrapsLastBossDraw();

    // 3. Across every step of the Boss's descent from above toward the Sphere
    for (let i = 0; i < 35; i++) {
      drawImageCalls.length = 0;
      modal.stepSceneForTest(0.2);
      assertHitboxWrapsLastBossDraw();
    }
    expect(modal.getChoreographySnapshot().bossState).toBe('idle');

    // 4. Boss is now at the Sphere in 'idle'; spawn a rift (APARAR appears BEFORE attack)
    gameState.spawnBossRift();
    modal.updateUI();
    expect(riftsLayer.children.length).toBe(1);

    // Advance rift age past telegraph window (0.65s) so Boss begins attack animation
    gameState.activeBossBattle!.activeRifts[0].remainingSec -= 0.7;
    drawImageCalls.length = 0;
    modal.stepSceneForTest(0.05);
    assertHitboxWrapsLastBossDraw();
    const idleAttackLeft = parseInt(attackBtn.style.left, 10);

    // 5. Mid-attack lunge frames: hitbox dynamically tracks the lunging sprite frame-by-frame!
    for (let i = 0; i < 8; i++) {
      drawImageCalls.length = 0;
      modal.stepSceneForTest(0.12);
      assertHitboxWrapsLastBossDraw();
    }
    const lungingLeft = parseInt(attackBtn.style.left, 10);
    expect(lungingLeft).toBeGreaterThan(idleAttackLeft);

    // 6. Clicking APARAR interrupts the attack and immediately snaps both sprite and hitbox back to idle frame 0
    drawImageCalls.length = 0;
    const hpBeforeParry = gameState.activeBossBattle!.bossHp;
    const integrityBeforeParry = gameState.activeBossBattle!.altarIntegrity;
    riftsLayer.children[0].dispatchClick();
    expect(gameState.activeBossBattle!.bossHp).toBe(hpBeforeParry);
    expect(gameState.activeBossBattle!.altarIntegrity).toBe(integrityBeforeParry);
    assertHitboxWrapsLastBossDraw();

    modal.close();
  });

  it('starts counting Boss combat and descends the Boss ONLY after the Faithful and Incarnation form the expanded 360° circle around BOTH Boss and Sphere', () => {
    const { modal, gameState } = setupBossModalHarness(400);
    expect(modal.openForBoss('boss_cronos')).toBe(true);

    const maxHp = gameState.activeBossBattle!.bossMaxHp;
    const maxIntegrity = gameState.activeBossBattle!.maxAltarIntegrity;

    // 1. At start: Incarnation walks toward Patio dos Fieis; ALL devotees wait inside Patio; combat has NOT started
    const startSnap = modal.getChoreographySnapshot();
    expect(startSnap.incState).toBe('walking_to_patio');
    expect(startSnap.bossState).toBe('awaiting_ritual');
    expect(startSnap.combatStarted).toBe(false);
    expect(startSnap.circleRadius).toBeGreaterThanOrEqual(520);
    expect(startSnap.followers.length).toBeGreaterThanOrEqual(28);
    expect(startSnap.followers.every((f) => f.state === 'waiting_in_patio')).toBe(true);

    // Even if gameState ticks 10s or player clicks during the ritual, zero Boss damage / zero rifts / zero Sphere damage occur!
    gameState.tick(10);
    expect(gameState.addClick(() => 0).bossClickDamage).toBe(0);
    expect(gameState.activeBossBattle!.bossHp).toBe(maxHp);
    expect(gameState.activeBossBattle!.altarIntegrity).toBe(maxIntegrity);
    expect(gameState.activeBossBattle!.activeRifts).toHaveLength(0);

    // Advance 2.6s: Incarnation is still en route to Patio; devotees STILL wait in Patio
    for (let i = 0; i < 13; i++) modal.stepSceneForTest(0.2);
    const midOutbound = modal.getChoreographySnapshot();
    expect(midOutbound.incState).toBe('walking_to_patio');
    expect(midOutbound.combatStarted).toBe(false);
    expect(midOutbound.followers.every((f) => f.state === 'waiting_in_patio')).toBe(true);

    // 2. Step until Incarnation arrives inside the Patio dos Fieis ('gathering_at_patio')
    let arrivedAtPatio = false;
    for (let i = 0; i < 25; i++) {
      modal.stepSceneForTest(0.12);
      const snap = modal.getChoreographySnapshot();
      if (snap.incState === 'gathering_at_patio') {
        arrivedAtPatio = true;
        expect(Math.hypot(snap.incX - snap.patioGatherSpot.x, snap.incY - snap.patioGatherSpot.y)).toBeLessThan(2);
        expect(snap.followers.every((f) => f.state === 'waiting_in_patio')).toBe(true);
        expect(snap.combatStarted).toBe(false);
        break;
      }
    }
    expect(arrivedAtPatio).toBe(true);

    // 3. Step into 'leading_procession' and verify strict single-file queue ordering while combat STILL has not started
    for (let i = 0; i < 24; i++) modal.stepSceneForTest(0.12);
    const lineSnap = modal.getChoreographySnapshot();
    expect(lineSnap.incState).toBe('leading_procession');
    expect(lineSnap.bossState).toBe('awaiting_ritual');
    expect(lineSnap.combatStarted).toBe(false);
    const marchingOnTrail = lineSnap.followers.filter(
      (f) => f.state === 'following_in_line' && f.trailS > 0
    );
    expect(marchingOnTrail.length).toBeGreaterThanOrEqual(5);
    for (let i = 1; i < marchingOnTrail.length; i++) {
      expect(marchingOnTrail[i - 1].trailS).toBeGreaterThan(marchingOnTrail[i].trailS);
    }

    // 4. Step finely until the exact moment combat starts; verify before that moment it NEVER started prematurely
    let descendStartSnap = modal.getChoreographySnapshot();
    for (let i = 0; i < 160; i++) {
      const before = modal.getChoreographySnapshot();
      if (before.incState !== 'guarding' || !before.followers.every((f) => f.state === 'encircling')) {
        expect(before.combatStarted).toBe(false);
        expect(before.bossState).toBe('awaiting_ritual');
      }
      modal.stepSceneForTest(0.08);
      descendStartSnap = modal.getChoreographySnapshot();
      if (descendStartSnap.bossState === 'walking') break;
    }

    const R = descendStartSnap.circleRadius;
    expect(descendStartSnap.combatStarted).toBe(false);
    expect(descendStartSnap.incState).toBe('guarding');
    expect(
      Math.hypot(
        descendStartSnap.incX - descendStartSnap.incGuardSpot.x,
        descendStartSnap.incY - descendStartSnap.incGuardSpot.y
      )
    ).toBeLessThan(2);
    // Incarnation herself stands on the expanded R = 535 circle!
    expect(Math.hypot(descendStartSnap.incX - 1740, descendStartSnap.incY - 854)).toBeCloseTo(R, 0);
    expect(descendStartSnap.followers.every((f) => f.state === 'encircling')).toBe(true);
    expect(descendStartSnap.bossState).toBe('walking');
    expect(descendStartSnap.bossX).toBe(180);
    expect(Math.hypot(descendStartSnap.bossX - 1740, descendStartSnap.bossY - 854)).toBeGreaterThan(1500);

    // Check that all 4 quadrants are populated on the expanded circle (R = 535) and all figures are evenly spaced without overlap
    const quadrants = new Set<string>();
    const allCircleFigures = [
      ...descendStartSnap.followers.map((f) => ({ x: f.x, y: f.y })),
      { x: descendStartSnap.incX, y: descendStartSnap.incY },
    ];
    for (const fig of allCircleFigures) {
      const dx = fig.x - 1740;
      const dy = fig.y - 854;
      expect(Math.hypot(dx, dy)).toBeGreaterThan(R - 4);
      expect(Math.hypot(dx, dy)).toBeLessThan(R + 4);
      quadrants.add(`${dx >= 0 ? 'R' : 'L'}${dy >= 0 ? 'B' : 'T'}`);
    }
    expect(quadrants.size).toBe(4);
    for (let i = 0; i < allCircleFigures.length; i++) {
      for (let j = i + 1; j < allCircleFigures.length; j++) {
        const pairDist = Math.hypot(
          allCircleFigures[i].x - allCircleFigures[j].x,
          allCircleFigures[i].y - allCircleFigures[j].y
        );
        expect(pairDist).toBeGreaterThan(75);
      }
    }

    // 5. Boss descends into the interior of the expanded circle so BOTH Boss and Sphere are inside the circle
    gameState.tick(1);
    expect(gameState.activeBossBattle!.bossHp).toBe(maxHp);

    modal.stepSceneForTest(1.0);
    const midDescentSnap = modal.getChoreographySnapshot();
    expect(midDescentSnap.bossState).toBe('walking');
    expect(midDescentSnap.bossX).toBeGreaterThan(descendStartSnap.bossX + 120);
    expect(midDescentSnap.bossY).toBeLessThan(865);

    for (let i = 0; i < 35; i++) modal.stepSceneForTest(0.2);
    const arrivedBossSnap = modal.getChoreographySnapshot();
    expect(arrivedBossSnap.bossState).toBe('idle');
    expect(arrivedBossSnap.bossX).toBe(1415);
    expect(arrivedBossSnap.bossY).toBe(865);
    expect(arrivedBossSnap.combatStarted).toBe(true);

    // Verify BOTH Boss (incl. 160px sprite half-width) AND Sphere (incl. 200px radius) sit well inside the circle!
    const minCircleX = Math.min(...allCircleFigures.map((p) => p.x));
    const maxCircleX = Math.max(...allCircleFigures.map((p) => p.x));
    const minCircleY = Math.min(...allCircleFigures.map((p) => p.y));
    const maxCircleY = Math.max(...allCircleFigures.map((p) => p.y));
    expect(arrivedBossSnap.bossX - 150).toBeGreaterThan(minCircleX);
    expect(1740 + 200).toBeLessThan(maxCircleX);
    expect(Math.min(arrivedBossSnap.bossY - 210, 854 - 200)).toBeGreaterThan(minCircleY);
    expect(Math.max(arrivedBossSnap.bossY + 95, 854 + 265)).toBeLessThan(maxCircleY);

    modal.close();
  });

  it('produces clean, non-hairpin, non-intersecting routes even when Altar da Encarnacao and Patio dos Fieis are dragged to arbitrary board positions', () => {
    const { modal } = setupBossModalHarness(400, {
      incarnationBox: { x: 2150, y: 740, w: 420, h: 210 },
      followersBox: { x: 860, y: 520, w: 512, h: 240 },
    });
    expect(modal.openForBoss('boss_cronos')).toBe(true);

    const initial = modal.getChoreographySnapshot();
    const R = initial.circleRadius;

    for (const pt of initial.outboundPath) {
      expect(Math.hypot(pt.x - 1740, pt.y - 854)).toBeGreaterThan(315);
    }

    let prevAngle: number | null = null;
    for (const pt of initial.processionPath) {
      const dist = Math.hypot(pt.x - 1740, pt.y - 854);
      expect(dist).toBeGreaterThanOrEqual(R - 1);
      const angle = Math.atan2(pt.y - 854, pt.x - 1740);
      if (prevAngle !== null) {
        const dTheta = Math.atan2(Math.sin(angle - prevAngle), Math.cos(angle - prevAngle));
        expect(dTheta).toBeGreaterThanOrEqual(-1e-4);
      }
      prevAngle = angle;
    }

    for (let i = 0; i < 200; i++) {
      modal.stepSceneForTest(0.15);
      if (modal.getChoreographySnapshot().combatStarted) break;
    }
    const done = modal.getChoreographySnapshot();
    expect(done.combatStarted).toBe(true);
    expect(done.incState).toBe('guarding');
    expect(done.followers.every((f) => f.state === 'encircling')).toBe(true);

    modal.close();
  });

  it('shows the courtyard while the Faithful gather and return, and hides it during the procession and fight', () => {
    const { modal, gameState } = setupBossModalHarness(100);
    const courtyardVisible = () => document.body.classList.contains('is-courtyard-visible');
    expect(modal.openForBoss('boss_cronos')).toBe(true);

    while (modal.getChoreographySnapshot().incState !== 'leading_procession') {
      expect(courtyardVisible()).toBe(true);
      modal.stepSceneForTest(0.1);
    }
    expect(courtyardVisible()).toBe(false);

    for (let i = 0; i < 250 && modal.getChoreographySnapshot().bossState !== 'idle'; i++) {
      modal.stepSceneForTest(0.2);
      expect(courtyardVisible()).toBe(false);
    }

    const battle = gameState.activeBossBattle!;
    battle.bossHp = 1;
    battle.sphereCooldownSec = 0;
    gameState.addClick(() => 0.5);
    modal.updateUI();
    modal.stepSceneForTest(1.5);
    expect(modal.getChoreographySnapshot().incState).toBe('leading_return');
    expect(courtyardVisible()).toBe(true);

    for (let i = 0; i < 800 && modal.isOpen(); i++) modal.stepSceneForTest(0.1);
    expect(modal.isOpen()).toBe(false);
    expect(courtyardVisible()).toBe(false);
  });

  it('holds the large battle canvas only while a fight is open', () => {
    const { modal, gameState, worldEl } = setupBossModalHarness(100);
    expect(modal.openForBoss('boss_cronos')).toBe(true);
    const canvas = worldEl.children[0].querySelector('#boss-world-canvas') as unknown as { width: number; height: number };
    expect(canvas.width).toBeGreaterThan(1000);
    expect(canvas.height).toBeGreaterThan(1000);
    gameState.retreatBossBattle();
    modal.close();
    expect(canvas.width).toBe(1);
    expect(canvas.height).toBe(1);
    expect(modal.openForBoss('boss_cronos')).toBe(true);
    expect(canvas.width).toBeGreaterThan(1000);
    modal.close();
  });

  it('clears the courtyard state when retreating during the gathering', () => {
    const { modal, gameState } = setupBossModalHarness(100);
    expect(modal.openForBoss('boss_cronos')).toBe(true);
    expect(document.body.classList.contains('is-courtyard-visible')).toBe(true);
    gameState.retreatBossBattle();
    modal.close();
    expect(document.body.classList.contains('is-courtyard-visible')).toBe(false);
  });

  it.each([1, 4])('leads every Faithful home before returning to the actual altar at speed %s', speed => {
    const { modal, gameState, worldEl, notifications, cameraFrames, drawImageCalls } = setupBossModalHarness(100, {
      incarnationBox: { x: 650, y: 420, w: 420, h: 210 },
      followersBox: { x: 2400, y: 1100, w: 512, h: 240 }
    });
    expect(modal.openForBoss('boss_cronos')).toBe(true);
    for (let i = 0; i < 250 && modal.getChoreographySnapshot().bossState !== 'idle'; i++) {
      modal.stepSceneForTest(0.2);
    }
    const before = modal.getChoreographySnapshot();
    expect(before.incState).toBe('guarding');
    const battle = gameState.activeBossBattle!;
    battle.bossHp = 1;
    battle.sphereCooldownSec = 0;
    gameState.addClick(() => 0.5);
    expect(gameState.activeBossBattle).toBeNull();
    expect(gameState.isBossDefeated('boss_cronos')).toBe(true);
    modal.updateUI(); // State refreshes must not close the victory scene.
    modal.stepSceneForTest(1.5);
    expect(modal.getChoreographySnapshot().incState).toBe('leading_return');
    expect(modal.getChoreographySnapshot().followers.map(f => [f.x, f.y]))
      .toEqual(before.followers.map(f => [f.x, f.y]));
    expect(worldEl.children[0].querySelector('#boss-arena-attack-btn')!.style.display).toBe('none');
    modal.setSpeedMultiplier(speed);
    let sawWalkHome = false;
    for (let i = 0; i < 400 && modal.isOpen(); i++) {
      const previous = modal.getChoreographySnapshot();
      drawImageCalls.length = 0;
      modal.stepSceneForTest(0.1);
      const snapshot = modal.getChoreographySnapshot();
      expect(Math.hypot(snapshot.incX - previous.incX, snapshot.incY - previous.incY))
        .toBeLessThanOrEqual(460 * speed * 0.1 + 0.01);
      if (modal.isOpen()) {
        expect(notifications.showCustomPopup).not.toHaveBeenCalled();
        expect(drawImageCalls.some(c => c.sw === 256 && c.sh === 192)).toBe(false);
        expect(cameraFrames.at(-1)?.phase).toBe('incarnation');
      }
      if (snapshot.incState === 'returning_to_altar') {
        sawWalkHome = true;
        expect(snapshot.followers.every(f => f.state === 'waiting_in_patio')).toBe(true);
        for (const f of snapshot.followers) {
          const home = snapshot.followerHomes.find(h => h.id === f.id)!;
          expect({ x: f.x, y: f.y }).toEqual({ x: home.x, y: home.y });
        }
      }
    }
    expect(sawWalkHome).toBe(true);
    expect(modal.isOpen()).toBe(false);
    const end = modal.getChoreographySnapshot();
    expect({ x: end.incX, y: end.incY }).toEqual(before.incarnationHome);
    expect(document.body.classList.contains('is-boss-battle-active')).toBe(false);
    expect(notifications.showCustomPopup).toHaveBeenCalledTimes(1);
  });

  it('keeps defeat on its existing short climax without starting a victory return', () => {
    const { modal, gameState, notifications } = setupBossModalHarness(100);
    modal.openForBoss('boss_cronos');
    for (let i = 0; i < 200 && modal.getChoreographySnapshot().bossState !== 'idle'; i++) {
      modal.stepSceneForTest(0.2);
    }
    gameState.activeBossBattle!.altarIntegrity = 0.01;
    gameState.tick(0.1);
    expect(gameState.activeBossBattle).toBeNull();
    modal.stepSceneForTest(1.5);
    expect(modal.isOpen()).toBe(false);
    expect(modal.getChoreographySnapshot().incState).toBe('guarding');
    expect(notifications.showCustomPopup).toHaveBeenCalledTimes(1);
  });

  it('renders Fulgor Divino on the Sphere, 1.5s Faithful Miracles on the circle, Phase II special attacks, and a 1.5s visual climax', () => {
    const { modal, gameState, worldEl, drawImageCalls, notifications } = setupBossModalHarness(100);
    expect(modal.openForBoss('boss_cronos')).toBe(true);

    for (let i = 0; i < 160 && modal.getChoreographySnapshot().bossState !== 'idle'; i++) {
      modal.stepSceneForTest(0.2);
    }
    expect(modal.getChoreographySnapshot().bossState).toBe('idle');

    const stage = worldEl.children[0];
    const fulgorBtn = stage.querySelector('#boss-sphere-fulgor-btn')!;
    const riftsLayer = stage.querySelector('#boss-rifts-layer')!;
    const battle = gameState.activeBossBattle!;

    // 1. Charge Sphere to 100% and fire Fulgor Divino button (pure attack, no heal)
    battle.altarIntegrity = 65;
    battle.sphereCharge = 100;
    modal.updateUI();
    expect(fulgorBtn.classList.contains('is-ready')).toBe(true);
    const hpBeforeFulgor = battle.bossHp;
    fulgorBtn.dispatchClick();
    expect(battle.bossHp).toBeLessThan(hpBeforeFulgor);
    expect(battle.sphereCharge).toBe(0);
    expect(battle.altarIntegrity).toBe(65);

    // 2. Faithful Miracle on the Sacred Circle (1.5s window, heals +10% Integrity)
    gameState.spawnBossMiracle(0);
    modal.updateUI();
    const miracleBtn = riftsLayer.querySelector('#boss-miracle-btn')!;
    expect(miracleBtn).not.toBeNull();
    expect(miracleBtn.textContent).toContain('1.5s');
    miracleBtn.dispatchClick();
    expect(battle.altarIntegrity).toBe(75);
    expect(battle.activeMiracle).toBeNull();

    // 3. Phase II transition banner and Hades Special Attack 2 (ataque-correntes / GRILHÃO)
    battle.bossHp = battle.bossMaxHp * 0.55;
    battle.highestPhaseShocked = 2;
    battle.phase = 2;
    modal.updateUI();
    const phaseBanner = stage.querySelector('#boss-phase-banner')!;
    expect(phaseBanner.style.display).toBe('block');
    expect(phaseBanner.textContent).toContain('FASE II');

    battle.activeRifts = [];
    gameState.spawnBossRift({ forceSpecial: true });
    modal.updateUI();
    expect(battle.activeRifts).toHaveLength(2);
    expect(battle.activeRifts[0].kind).toBe('hades_chains');
    battle.activeRifts[0].remainingSec -= 0.7;
    drawImageCalls.length = 0;
    modal.stepSceneForTest(0.05);
    const lastBossDraw = [...drawImageCalls].reverse().find(c => c.sw === 256 && c.sh === 192)!;
    expect((lastBossDraw.img as { src: string }).src).toContain('/02-hades/ataque-correntes/spritesheet.png');

    // 4. Victory climax runs before the return procession and result popup
    battle.bossHp = 1;
    battle.sphereCooldownSec = 0;
    gameState.addClick(() => 0.5);
    expect(modal.isOpen()).toBe(true);
    expect(modal.getChoreographySnapshot().climaxRemainingSec).toBeCloseTo(1.5, 1);

    modal.stepSceneForTest(0.8);
    expect(modal.isOpen()).toBe(true);
    modal.stepSceneForTest(0.8);
    expect(modal.isOpen()).toBe(true);
    expect(modal.getChoreographySnapshot().incState).toBe('leading_return');
    expect(notifications.showCustomPopup).not.toHaveBeenCalled();
    for (let i = 0; i < 400 && modal.isOpen(); i++) modal.stepSceneForTest(0.1);
    expect(modal.isOpen()).toBe(false);
    expect(notifications.showCustomPopup).toHaveBeenCalledTimes(1);
  });
});
