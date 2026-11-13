import {
  FOLLOWER_FRAME_SIZE, PRAYER_DURATION, PRAYER_SEQUENCE_DURATION, followerAnimationFrame,
  loadFollowerSprites, visibleFollowerTiers, type FollowerTier,
} from './followerVisuals.js';
import { scheduleVisualFrame, VisualFrameClock, visualFrameScale } from '../../ui/visualTiming.js';

export interface Walker {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  facing: number; // 1 = right, -1 = left
  variant: FollowerTier; // Iniciado, Hierofante, Pontífice
  state: 'walk' | 'idle' | 'pray';
  stateTimer: number;
  walkCycle: number;
  prayCycle: number;
  idleCycle: number;
  breathTimer: number;
  prayParticles: Array<{ x: number; y: number; vy: number; alpha: number; size: number }>;
  isMiraclePlea?: boolean;
  miracleTimer?: number;
}

export class FollowersArena {
  public static latestInstance: FollowersArena | null = null;
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public walkers: Walker[] = [];
  private nextId: number = 1;
  private cancelFrame: (() => void) | null = null;
  private width: number = 380;
  private height: number = 220;
  private dpr: number = 1;
  private onFollowerClickCallback?: (x: number, y: number) => void;
  private onMiracleClickCallback?: (clientX: number, clientY: number, walker: Walker) => void;
  private miraclesUnlocked: () => boolean = () => false;
  private miraclesAutoCollected: () => boolean = () => false;
  private miracleSpawnCooldown: number = 5; // ~5s after start
  private isPaused: boolean = false;
  private speedMultiplier: number = 1.0;
  private sprites = loadFollowerSprites();
  private totalFollowerCount = 0;
  private isOnScreen: boolean = true;

  constructor(canvasId: string = 'followers-walk-canvas') {
    FollowersArena.latestInstance = this;
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    this.initCanvas();
    this.setupEvents();
    this.startLoop();
  }

  public getArenaDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  public setSpeedMultiplier(mult: number): void {
    this.speedMultiplier = Math.max(0, mult);
  }

  public getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  public setOnClickCallback(cb: (x: number, y: number) => void): void {
    this.onFollowerClickCallback = cb;
  }

  public setOnMiracleClickCallback(cb: (clientX: number, clientY: number, walker: Walker) => void): void {
    this.onMiracleClickCallback = cb;
  }

  public setMiraclePolicy(unlocked: () => boolean, autoCollected: () => boolean): void {
    this.miraclesUnlocked = unlocked;
    this.miraclesAutoCollected = autoCollected;
  }

  public triggerMiraclePlea(targetWalker?: Walker): void {
    if (!this.miraclesUnlocked()) return;
    const available = this.walkers.filter((w) => w.state !== 'pray');
    const w = targetWalker || (available.length > 0 ? available[Math.floor(Math.random() * available.length)] : null);
    if (!w) return;
    w.isMiraclePlea = true;
    w.miracleTimer = 15; // elapsed seconds
    w.state = 'pray';
    w.prayCycle = 0;
    w.stateTimer = 900;
    this.spawnPrayerParticles(w, 10);
    if (this.miraclesAutoCollected()) this.collectAvailableMiracle();
    this.syncMiracleHighlight();
  }

  private syncMiracleHighlight(): void {
    this.canvas.closest('#card-followers')?.classList.toggle(
      'has-miracle', this.walkers.some(w => w.isMiraclePlea && (w.miracleTimer ?? 0) > 0)
    );
  }

  public collectAvailableMiracle(): boolean {
    const walker = this.walkers.find(w => w.isMiraclePlea && (w.miracleTimer ?? 0) > 0);
    if (!walker) return false;
    const rect = this.canvas.getBoundingClientRect();
    this.acceptMiracle(walker, rect.left + walker.x * rect.width / this.width,
      rect.top + (walker.y - 78) * rect.height / this.height);
    return true;
  }

  private acceptMiracle(w: Walker, clientX: number, clientY: number): void {
    w.isMiraclePlea = false;
    w.miracleTimer = 0;
    this.syncMiracleHighlight();
    w.state = 'pray';
    // The plea already played the kneeling animation; start its blessing now.
    w.prayCycle = PRAYER_DURATION;
    w.stateTimer = 0;
    this.spawnPrayerParticles(w, 18);
    this.onMiracleClickCallback?.(clientX, clientY, w);
  }

  public resize(): void {
    const cssW = this.canvas.clientWidth || this.canvas.offsetWidth || 400;
    const cssH = this.canvas.clientHeight || this.canvas.offsetHeight || 220;
    if (cssW > 30 && cssH > 30) {
      if (Math.abs(this.width - cssW) > 0.5 || Math.abs(this.height - cssH) > 0.5) {
        this.width = cssW;
        this.height = cssH;
        this.canvas.width = Math.floor(this.width * this.dpr);
        this.canvas.height = Math.floor(this.height * this.dpr);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.dpr, this.dpr);

        const pad = 24;
        const minY = Math.max(90, this.height * 0.12);
        const maxY = Math.max(minY + 20, this.height - 18);
        for (const w of this.walkers) {
          w.x = Math.max(pad, Math.min(this.width - pad, w.x));
          w.y = Math.max(minY, Math.min(maxY, w.y));
          w.targetX = Math.max(pad, Math.min(this.width - pad, w.targetX));
          w.targetY = Math.max(minY, Math.min(maxY, w.targetY));
        }
        this.draw();
      }
    }
  }

  private initCanvas(): void {
    const cssW = this.canvas.clientWidth || this.canvas.offsetWidth;
    const cssH = this.canvas.clientHeight || this.canvas.offsetHeight;
    this.width = cssW > 50 ? cssW : 400;
    this.height = cssH > 50 ? cssH : 220;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.scale(this.dpr, this.dpr);

    window.addEventListener('resize', () => {
      this.resize();
    });

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        this.resize();
      });
      ro.observe(this.canvas);
      if (this.canvas.parentElement) {
        ro.observe(this.canvas.parentElement);
      }
    }

    // Skip drawing while the courtyard is panned off-screen or its card is hidden
    if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver((entries) => {
        this.isOnScreen = entries[entries.length - 1].isIntersecting;
      }).observe(this.canvas);
    }
  }

  private setupEvents(): void {
    this.canvas.addEventListener('click', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? this.width / rect.width : 1;
      const scaleY = rect.height > 0 ? this.height / rect.height : 1;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      // 1. Check if clicked on a walker requesting a miracle (prioritize miracle bubble)
      let miracleWalker: Walker | null = null;
      for (const w of this.walkers) {
        if (w.isMiraclePlea) {
          const dx = w.x - clickX;
          const dy = (w.y - 78) - clickY;
          if (Math.hypot(dx, dy) < 42) {
            miracleWalker = w;
            break;
          }
        }
      }

      if (miracleWalker) {
        this.acceptMiracle(miracleWalker, e.clientX, e.clientY);
        return;
      }

      // 2. Check if clicked on/near a normal walker
      let hitWalker: Walker | null = null;
      for (const w of this.walkers) {
        const dx = w.x - clickX;
        const dy = w.y - 34 - clickY;
        if (Math.hypot(dx, dy) < 32) {
          hitWalker = w;
          break;
        }
      }

      if (hitWalker) {
        if (hitWalker.isMiraclePlea) {
          this.acceptMiracle(hitWalker, e.clientX, e.clientY);
          return;
        }
        if (hitWalker.state !== 'pray') {
          hitWalker.state = 'idle';
          hitWalker.stateTimer = 60;
          hitWalker.facing = clickX >= hitWalker.x ? 1 : -1;
        }
        if (this.onFollowerClickCallback) {
          this.onFollowerClickCallback(e.clientX, e.clientY);
        }
      } else {
        // Move nearest walker towards click
        if (this.walkers.length > 0) {
          let nearest = this.walkers[0];
          let minDist = 9999;
          for (const w of this.walkers) {
            if (w.state === 'pray') continue;
            const dist = Math.hypot(w.x - clickX, w.y - clickY);
            if (dist < minDist) {
              minDist = dist;
              nearest = w;
            }
          }
          if (nearest.state === 'pray') return;
          nearest.targetX = clickX;
          nearest.targetY = clickY;
          nearest.state = 'walk';
          nearest.stateTimer = 180;
        }
      }
    });
  }

  public syncFollowerCount(totalCount: number, atEdge = false): void {
    if (totalCount === this.totalFollowerCount) return;
    this.totalFollowerCount = totalCount;
    const available = [...this.walkers];
    this.walkers = visibleFollowerTiers(totalCount).map(tier => {
      const index = available.findIndex(w => w.variant === tier);
      // Keep existing positions, prayers and miracle pleas when that tier survives.
      if (index >= 0) return available.splice(index, 1)[0];
      return this.addWalker(atEdge, tier);
    });
    this.syncMiracleHighlight();
  }

  public onFollowersAdded(addedCount: number): void {
    const previousIds = new Set(this.walkers.map(w => w.id));
    this.syncFollowerCount(this.totalFollowerCount + addedCount, true);
    for (const w of this.walkers.filter(w => !previousIds.has(w.id)).slice(0, 6)) {
      this.spawnPrayerParticles(w, 8);
    }
  }

  private addWalker(atEdge: boolean, tier: FollowerTier): Walker {
    const pad = 24;
    const minY = Math.max(90, this.height * 0.12);
    const maxY = Math.max(minY + 20, this.height - 18);
    let x = pad + Math.random() * Math.max(10, this.width - pad * 2);
    let y = minY + Math.random() * (maxY - minY);

    if (atEdge) {
      x = Math.random() > 0.5 ? pad : Math.max(pad, this.width - pad);
      y = minY + Math.random() * (maxY - minY);
    }

    const walker: Walker = {
      id: this.nextId++,
      x,
      y,
      vx: 0,
      vy: 0,
      targetX: pad + Math.random() * Math.max(10, this.width - pad * 2),
      targetY: minY + Math.random() * (maxY - minY),
      facing: Math.random() > 0.5 ? 1 : -1,
      variant: tier,
      state: 'walk',
      stateTimer: 60 + Math.floor(Math.random() * 120),
      walkCycle: Math.random() * 9,
      prayCycle: 0,
      idleCycle: Math.random() * 9,
      breathTimer: Math.random() * 100,
      prayParticles: []
    };

    return walker;
  }

  private spawnPrayerParticles(w: Walker, count: number): void {
    if (!this.isOnScreen) return;
    for (let i = 0; i < count; i++) {
      w.prayParticles.push({
        x: w.x + (Math.random() - 0.5) * 14,
        y: w.y - 28 - Math.random() * 10,
        vy: -0.5 - Math.random() * 0.7,
        alpha: 1.0,
        size: 1.2 + Math.random() * 1.6
      });
    }
  }

  private update(elapsedSec: number): void {
    if (typeof document !== 'undefined' && document.body.classList.contains('is-boss-battle-active')) {
      return;
    }

    const pad = 24;
    const minY = Math.max(90, this.height * 0.12);
    const maxY = Math.max(minY + 20, this.height - 18);

    const frameScale = visualFrameScale(elapsedSec);
    const speedScale = Math.min(this.speedMultiplier, 5) * frameScale;
    const timerStep = Math.max(1, Math.min(10, Math.floor(this.speedMultiplier))) * frameScale;

    for (const w of this.walkers) {
      w.stateTimer -= timerStep;
      w.breathTimer += 0.05 * speedScale;

      // Update prayer particles
      for (let i = w.prayParticles.length - 1; i >= 0; i--) {
        const p = w.prayParticles[i];
        p.y += p.vy * speedScale;
        p.alpha -= 0.02 * speedScale;
        if (p.alpha <= 0) {
          const last = w.prayParticles.pop()!;
          if (i < w.prayParticles.length) {
            w.prayParticles[i] = last;
          }
        }
      }

      // State machine transitions
      const finishingPrayer = w.state === 'pray' && w.prayCycle < PRAYER_SEQUENCE_DURATION;
      if (w.stateTimer <= 0 && !finishingPrayer) {
        const rand = Math.random();
        if (rand < 0.5) {
          w.state = 'walk';
          w.stateTimer = 100 + Math.floor(Math.random() * 180);
          w.targetX = pad + Math.random() * Math.max(10, this.width - pad * 2);
          w.targetY = minY + Math.random() * (maxY - minY);
        } else {
          w.state = 'idle';
          w.stateTimer = 60 + Math.floor(Math.random() * 100);
        }
      }

      if (w.state === 'walk') {
        const dx = w.targetX - w.x;
        const dy = w.targetY - w.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 3) {
          const speed = (0.5 + (w.variant % 3) * 0.12) * speedScale;
          w.vx = (dx / dist) * speed;
          w.vy = (dy / dist) * speed;
          w.x += w.vx;
          w.y += w.vy;
          w.facing = w.vx >= 0 ? 1 : -1;
          w.walkCycle += elapsedSec * Math.min(this.speedMultiplier, 5) / 0.12;
        } else {
          w.state = 'idle';
          w.stateTimer = 70 + Math.floor(Math.random() * 70);
        }
      } else if (w.state === 'pray') {
        w.prayCycle += elapsedSec * Math.min(this.speedMultiplier, 5);
        // Emit gentle sparks at deep reverence frames
        const frame = Math.floor(w.prayCycle) % 9;
        if ((frame === 3 || frame === 5) && Math.random() < 1 - 0.75 ** frameScale) {
          this.spawnPrayerParticles(w, 1);
        }
      } else {
        // Idle
        w.idleCycle += 0.05 * speedScale;
      }

      // Miracle plea updates
      if (w.isMiraclePlea) {
        w.miracleTimer = (w.miracleTimer || 0) - elapsedSec * this.speedMultiplier;
        w.state = 'pray';
        w.stateTimer = Math.max(20, w.miracleTimer * 60);
        if (Math.random() < 1 - 0.85 ** frameScale) {
          this.spawnPrayerParticles(w, 1);
        }
        if (w.miracleTimer <= 0) {
          w.isMiraclePlea = false;
          this.syncMiracleHighlight();
          w.state = 'idle';
          w.stateTimer = 60;
        }
      }

      // Keep within arena bounds
      w.x = Math.max(pad, Math.min(this.width - pad, w.x));
      w.y = Math.max(minY, Math.min(maxY, w.y));
    }

    // Periodically spawn a miracle plea
    if (this.walkers.length > 0 && this.miraclesUnlocked()) {
      let hasActiveMiracle = false;
      for (let i = 0; i < this.walkers.length; i++) {
        if (this.walkers[i].isMiraclePlea) {
          hasActiveMiracle = true;
          break;
        }
      }
      if (!hasActiveMiracle) {
        this.miracleSpawnCooldown -= elapsedSec * this.speedMultiplier;
        if (this.miracleSpawnCooldown <= 0) {
          this.triggerMiraclePlea();
          this.miracleSpawnCooldown = 35 + Math.random() * 30;
        }
      }
    }
  }

  private readonly sortedWalkers: Walker[] = [];
  private wasClearedForBossBattle = false;

  private draw(): void {
    const ctx = this.ctx;
    if (typeof document !== 'undefined' && document.body.classList.contains('is-boss-battle-active')) {
      if (!this.wasClearedForBossBattle) {
        ctx.clearRect(0, 0, this.width, this.height);
        this.wasClearedForBossBattle = true;
      }
      return;
    }
    this.wasClearedForBossBattle = false;
    ctx.clearRect(0, 0, this.width, this.height);

    // Sort walkers by Y position for proper isometric depth rendering without allocating a new array
    const count = this.walkers.length;
    this.sortedWalkers.length = count;
    for (let i = 0; i < count; i++) {
      this.sortedWalkers[i] = this.walkers[i];
    }
    this.sortedWalkers.sort((a, b) => a.y - b.y);

    for (let i = 0; i < count; i++) {
      this.drawWalker(this.sortedWalkers[i]);
    }
  }

  private drawWalker(w: Walker): void {
    const ctx = this.ctx;
    const x = Math.round(w.x);
    const y = Math.round(w.y);

    // 1. Pixel contact shadow under the feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(x - 12, y - 1, 24, 3);

    // 2. Pixel-art devotee
    this.drawFollowerSprite(w, x, y);

    // 3. Prayer sparks as square pixels, in arena coordinates
    for (const p of w.prayParticles) {
      const size = Math.max(2, Math.round(p.size * 1.5));
      ctx.fillStyle = `rgba(246, 220, 154, ${p.alpha})`;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
    }

    // 4. Draw miracle plea speech bubble if requesting miracle
    if (w.isMiraclePlea) {
      this.drawMiracleSpeechBubble(w, x, y);
    }
  }

  private drawFollowerSprite(w: Walker, x: number, y: number): void {
    const { action, frame } = followerAnimationFrame(w.state, w.walkCycle, w.prayCycle, w.isMiraclePlea);
    const image = this.sprites[w.variant][action];
    if (!image.complete || image.naturalWidth === 0) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Reduce the 96px sprites to 80px, keeping source row 89 at the feet.
    ctx.translate(x, y);
    ctx.scale(w.facing, 1);
    ctx.drawImage(
      image,
      frame * FOLLOWER_FRAME_SIZE, 0, FOLLOWER_FRAME_SIZE, FOLLOWER_FRAME_SIZE,
      -40, -74, 80, 80
    );
    ctx.restore();
  }

  // Pixel speech bubble (3px grid) with a twinkling star asking for a miracle
  private drawMiracleSpeechBubble(w: Walker, x: number, y: number): void {
    const ctx = this.ctx;
    const px = 3;
    const bob = Math.sin(w.breathTimer * 4) > 0 ? px : 0;
    const blink = Math.sin(w.breathTimer * 6) > 0;

    const cols = 11;
    const rows = 8;
    const left = Math.round(Math.max(6, Math.min(this.width - cols * px - 6, x - (cols * px) / 2)));
    const top = Math.round(Math.max(4, y - 96 - bob));

    // Gold frame, dark plate, tail pointing at the devotee
    ctx.fillStyle = blink ? '#f6dc9a' : '#c99a4e';
    ctx.fillRect(left + px, top, (cols - 2) * px, rows * px);
    ctx.fillRect(left, top + px, cols * px, (rows - 2) * px);
    ctx.fillRect(left + 4 * px, top + rows * px, 3 * px, px);
    ctx.fillRect(left + 5 * px, top + (rows + 1) * px, px, px);
    ctx.fillStyle = '#0f0c0a';
    ctx.fillRect(left + px, top + px, (cols - 2) * px, (rows - 2) * px);
    ctx.fillRect(left + 5 * px, top + rows * px, px, px);

    // Four-point star
    const cx = left + 5 * px;
    const cy = top + 3 * px;
    ctx.fillStyle = '#f6dc9a';
    ctx.fillRect(cx, cy - px, px, 4 * px);
    ctx.fillRect(cx - px, cy, 3 * px, 2 * px);
    if (blink) {
      ctx.fillRect(cx - 2 * px, cy + px / 2, px, px);
      ctx.fillRect(cx + 2 * px, cy + px / 2, px, px);
    }
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
    }
  }

  private startLoop(): void {
    const clock = new VisualFrameClock();
    const loop = (nowMs: number) => {
      const isBossBattleActive =
        typeof document !== 'undefined' && document.body.classList.contains('is-boss-battle-active');
      const elapsedSec = clock.tick(nowMs);
      if (elapsedSec !== null && !this.isPaused) {
        this.update(elapsedSec);
        if (this.isOnScreen && document.visibilityState !== 'hidden') this.draw();
      }
      this.cancelFrame = scheduleVisualFrame(this.isOnScreen && !this.isPaused && !isBossBattleActive, loop);
    };
    this.cancelFrame = scheduleVisualFrame(this.isOnScreen, loop);
  }

  public destroy(): void {
    this.cancelFrame?.();
    this.cancelFrame = null;
  }
}
