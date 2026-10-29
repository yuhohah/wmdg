import { getDevoteeSheet, type DevoteeSheet } from './pixelArt.js';

export interface Walker {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  facing: number; // 1 = right, -1 = left
  variant: number; // 0..8 (9 unique devotees!)
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
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public walkers: Walker[] = [];
  private nextId: number = 1;
  private animFrameId: number | null = null;
  private width: number = 380;
  private height: number = 220;
  private dpr: number = 1;
  private onFollowerClickCallback?: (x: number, y: number) => void;
  private onMiracleClickCallback?: (clientX: number, clientY: number, walker: Walker) => void;
  private miracleSpawnCooldown: number = 5; // ~5s after start
  private isPaused: boolean = false;
  private speedMultiplier: number = 1.0;
  private sheet: DevoteeSheet = getDevoteeSheet();
  private isOnScreen: boolean = true;

  constructor(canvasId: string = 'followers-walk-canvas') {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    this.initCanvas();
    this.setupEvents();
    this.startLoop();
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

  public triggerMiraclePlea(targetWalker?: Walker): void {
    const available = this.walkers.filter((w) => !w.isMiraclePlea);
    const w = targetWalker || (available.length > 0 ? available[Math.floor(Math.random() * available.length)] : null);
    if (!w) return;
    w.isMiraclePlea = true;
    w.miracleTimer = 15; // elapsed seconds
    w.state = 'pray';
    w.prayCycle = 0;
    w.stateTimer = 900;
    this.spawnPrayerParticles(w, 10);
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
        const minY = Math.max(28, this.height * 0.12);
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
          const dy = (w.y - 48) - clickY;
          if (Math.hypot(dx, dy) < 42) {
            miracleWalker = w;
            break;
          }
        }
      }

      if (miracleWalker) {
        miracleWalker.isMiraclePlea = false;
        miracleWalker.miracleTimer = 0;
        miracleWalker.state = 'pray';
        miracleWalker.prayCycle = 0;
        miracleWalker.stateTimer = 140;
        this.spawnPrayerParticles(miracleWalker, 18);
        if (this.onMiracleClickCallback) {
          this.onMiracleClickCallback(e.clientX, e.clientY, miracleWalker);
        }
        return;
      }

      // 2. Check if clicked on/near a normal walker
      let hitWalker: Walker | null = null;
      for (const w of this.walkers) {
        const dx = w.x - clickX;
        const dy = w.y - 32 - clickY;
        if (Math.hypot(dx, dy) < 32) {
          hitWalker = w;
          break;
        }
      }

      if (hitWalker) {
        hitWalker.state = 'pray';
        hitWalker.prayCycle = 0;
        hitWalker.stateTimer = 120;
        hitWalker.facing = clickX >= hitWalker.x ? 1 : -1;
        this.spawnPrayerParticles(hitWalker, 8);
        if (this.onFollowerClickCallback) {
          this.onFollowerClickCallback(e.clientX, e.clientY);
        }
      } else {
        // Move nearest walker towards click
        if (this.walkers.length > 0) {
          let nearest = this.walkers[0];
          let minDist = 9999;
          for (const w of this.walkers) {
            const dist = Math.hypot(w.x - clickX, w.y - clickY);
            if (dist < minDist) {
              minDist = dist;
              nearest = w;
            }
          }
          nearest.targetX = clickX;
          nearest.targetY = clickY;
          nearest.state = 'walk';
          nearest.stateTimer = 180;
        }
      }
    });
  }

  public syncFollowerCount(totalCount: number): void {
    // Show up to 35 active walker sprites for optimal visual balance and performance
    const targetCount = Math.min(totalCount, 35);
    while (this.walkers.length < targetCount) {
      this.addWalker();
    }
    while (this.walkers.length > targetCount) {
      this.walkers.pop();
    }
  }

  public onFollowersAdded(addedCount: number): void {
    const spawnCount = Math.min(addedCount, 6);
    for (let i = 0; i < spawnCount; i++) {
      if (this.walkers.length < 35) {
        const w = this.addWalker(true);
        this.spawnPrayerParticles(w, 8);
      }
    }
  }

  private addWalker(atEdge: boolean = false): Walker {
    const pad = 24;
    const minY = Math.max(28, this.height * 0.12);
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
      variant: Math.floor(Math.random() * 9), // 0..8
      state: 'walk',
      stateTimer: 60 + Math.floor(Math.random() * 120),
      walkCycle: Math.random() * 9,
      prayCycle: 0,
      idleCycle: Math.random() * 9,
      breathTimer: Math.random() * 100,
      prayParticles: []
    };

    this.walkers.push(walker);
    return walker;
  }

  private spawnPrayerParticles(w: Walker, count: number): void {
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
    const pad = 24;
    const minY = Math.max(28, this.height * 0.12);
    const maxY = Math.max(minY + 20, this.height - 18);

    const speedScale = Math.min(this.speedMultiplier, 5);
    const timerStep = Math.max(1, Math.min(10, Math.floor(this.speedMultiplier)));

    for (const w of this.walkers) {
      w.stateTimer -= timerStep;
      w.breathTimer += 0.05 * speedScale;

      // Update prayer particles
      for (let i = w.prayParticles.length - 1; i >= 0; i--) {
        const p = w.prayParticles[i];
        p.y += p.vy * speedScale;
        p.alpha -= 0.02 * speedScale;
        if (p.alpha <= 0) {
          w.prayParticles.splice(i, 1);
        }
      }

      // State machine transitions
      if (w.stateTimer <= 0) {
        const rand = Math.random();
        if (rand < 0.5) {
          w.state = 'walk';
          w.stateTimer = 100 + Math.floor(Math.random() * 180);
          w.targetX = pad + Math.random() * Math.max(10, this.width - pad * 2);
          w.targetY = minY + Math.random() * (maxY - minY);
        } else if (rand < 0.75) {
          w.state = 'pray';
          w.prayCycle = 0;
          w.stateTimer = 110 + Math.floor(Math.random() * 90);
          this.spawnPrayerParticles(w, 4);
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
          w.walkCycle += 0.16 * speedScale;
        } else {
          w.state = Math.random() > 0.4 ? 'pray' : 'idle';
          w.prayCycle = 0;
          w.stateTimer = 70 + Math.floor(Math.random() * 70);
          if (w.state === 'pray') {
            this.spawnPrayerParticles(w, 3);
          }
        }
      } else if (w.state === 'pray') {
        w.prayCycle += 0.075 * speedScale;
        // Emit gentle sparks at deep reverence frames
        const frame = Math.floor(w.prayCycle) % 9;
        if ((frame === 3 || frame === 5) && Math.random() < 0.25) {
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
        if (Math.random() < 0.15) {
          this.spawnPrayerParticles(w, 1);
        }
        if (w.miracleTimer <= 0) {
          w.isMiraclePlea = false;
          w.state = 'idle';
          w.stateTimer = 60;
        }
      }

      // Keep within arena bounds
      w.x = Math.max(pad, Math.min(this.width - pad, w.x));
      w.y = Math.max(minY, Math.min(maxY, w.y));
    }

    // Periodically spawn a miracle plea
    if (this.walkers.length > 0) {
      const hasActiveMiracle = this.walkers.some((w) => w.isMiraclePlea);
      if (!hasActiveMiracle) {
        this.miracleSpawnCooldown -= elapsedSec * this.speedMultiplier;
        if (this.miracleSpawnCooldown <= 0) {
          this.triggerMiraclePlea();
          this.miracleSpawnCooldown = 35 + Math.random() * 30;
        }
      }
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Sort walkers by Y position for proper isometric depth rendering
    const sorted = [...this.walkers].sort((a, b) => a.y - b.y);

    for (const w of sorted) {
      this.drawWalker(w);
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

  // Sheet columns: 0..3 walk cycle, 4..5 prayer; rows: robe palettes
  private drawFollowerSprite(w: Walker, x: number, y: number): void {
    const { canvas, frameW, frameH, variants, walkFrames, prayColumn } = this.sheet;
    const scale = 3;
    let col = 0;
    let bob = 0;

    if (w.state === 'walk') {
      col = Math.floor(w.walkCycle) % walkFrames;
      bob = col % 2 === 1 ? 1 : 0;
    } else if (w.state === 'pray') {
      col = prayColumn + (Math.floor(Math.abs(w.breathTimer * 0.8)) % 2);
    } else {
      bob = Math.sin(w.breathTimer) > 0.6 ? 1 : 0;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, y - bob * scale);
    ctx.scale(w.facing, 1);
    ctx.drawImage(
      canvas,
      col * frameW, (w.variant % variants) * frameH, frameW, frameH,
      (-frameW * scale) / 2, -frameH * scale + scale, frameW * scale, frameH * scale
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
    const top = Math.round(Math.max(4, y - 68 - bob));

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
    let previousMs: number | undefined;
    const loop = (nowMs: number) => {
      const elapsedSec = previousMs === undefined ? 0 : Math.max(0, (nowMs - previousMs) / 1000);
      previousMs = nowMs;
      if (!this.isPaused) {
        this.update(elapsedSec);
        if (this.isOnScreen) this.draw();
      }
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}
