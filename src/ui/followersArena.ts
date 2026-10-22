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

interface FollowerSpriteSet {
  walk: HTMLImageElement;
  pray: HTMLImageElement;
  idle: HTMLImageElement;
  walkLoaded: boolean;
  prayLoaded: boolean;
  idleLoaded: boolean;
}

export class FollowersArena {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public walkers: Walker[] = [];
  private nextId: number = 1;
  private animFrameId: number | null = null;
  private width: number = 380;
  private height: number = 240;
  private dpr: number = 1;
  private onFollowerClickCallback?: (x: number, y: number) => void;
  private onMiracleClickCallback?: (clientX: number, clientY: number, walker: Walker) => void;
  private miracleSpawnCooldown: number = 300; // ~5s after start
  private isPaused: boolean = false;
  private speedMultiplier: number = 1.0;
  public sprites: FollowerSpriteSet[] = [];

  constructor(canvasId: string = 'followers-walk-canvas') {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    this.initCanvas();
    this.loadSprites();
    this.setupEvents();
    this.startLoop();
  }

  public setSpeedMultiplier(mult: number): void {
    this.speedMultiplier = Math.max(0, mult);
  }

  public getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  private loadSprites(): void {
    for (let i = 0; i <= 8; i++) {
      const walk = new Image();
      walk.src = `/assets/procession/walk/follower-${i}-walk.png`;

      const pray = new Image();
      pray.src = `/assets/church/followers/follower-${i}-pray.png`;

      const idle = new Image();
      idle.src = `/assets/church/followers/follower-${i}-idle.png`;

      const spriteSet: FollowerSpriteSet = {
        walk,
        pray,
        idle,
        walkLoaded: false,
        prayLoaded: false,
        idleLoaded: false
      };

      walk.onload = () => {
        spriteSet.walkLoaded = true;
      };
      pray.onload = () => {
        spriteSet.prayLoaded = true;
      };
      idle.onload = () => {
        spriteSet.idleLoaded = true;
      };

      this.sprites.push(spriteSet);
    }
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
    w.miracleTimer = 900; // 15s at 60fps
    w.state = 'pray';
    w.prayCycle = 0;
    w.stateTimer = 900;
    this.spawnPrayerParticles(w, 10);
  }

  public resize(): void {
    const r = this.canvas.getBoundingClientRect();
    if (r.width > 30 && r.height > 30) {
      if (Math.abs(this.width - r.width) > 0.5 || Math.abs(this.height - r.height) > 0.5) {
        this.width = r.width;
        this.height = r.height;
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
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width > 50 ? rect.width : 400;
    this.height = rect.height > 50 ? rect.height : 240;
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
  }

  private setupEvents(): void {
    this.canvas.addEventListener('click', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

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

  private update(): void {
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
        w.miracleTimer = (w.miracleTimer || 0) - timerStep;
        w.state = 'pray';
        w.stateTimer = Math.max(20, w.miracleTimer);
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
        this.miracleSpawnCooldown -= timerStep;
        if (this.miracleSpawnCooldown <= 0) {
          this.triggerMiraclePlea();
          this.miracleSpawnCooldown = 2100 + Math.floor(Math.random() * 1800);
        }
      }
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    // Pure transparent clear
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

    // 1. Soft contact shadow under feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y - 2, 11, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Determine frame & sprite
    const spriteSet = this.sprites[w.variant % this.sprites.length];
    let img: HTMLImageElement | null = null;
    let isLoaded = false;
    let frame = 0;

    if (w.state === 'walk') {
      img = spriteSet?.walk || null;
      isLoaded = spriteSet?.walkLoaded || false;
      frame = Math.floor(w.walkCycle) % 9;
    } else if (w.state === 'pray') {
      img = spriteSet?.pray || null;
      isLoaded = spriteSet?.prayLoaded || false;
      frame = Math.floor(w.prayCycle) % 9;
    } else {
      img = spriteSet?.idle || null;
      isLoaded = spriteSet?.idleLoaded || false;
      frame = Math.floor(w.idleCycle) % 9;
    }

    // 3. Draw devotee sprite (64x72 per frame, feet at y=68)
    if (img && isLoaded) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(x, y);
      ctx.scale(w.facing, 1);
      ctx.drawImage(img, frame * 64, 0, 64, 72, -32, -68, 64, 72);
      ctx.restore();
    } else {
      // High-quality procedural devotee rendering with walking and prayer cycles
      this.renderProceduralCultist(w, x, y);
    }

    // 4. Draw prayer particles in absolute arena coordinates
    if (w.prayParticles.length > 0) {
      for (const p of w.prayParticles) {
        ctx.fillStyle = `rgba(251, 191, 36, ${p.alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. Draw miracle plea speech bubble if requesting miracle
    if (w.isMiraclePlea) {
      this.drawMiracleSpeechBubble(w, x, y);
    }
  }

  private renderProceduralCultist(w: Walker, x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(w.facing, 1);

    // Color palettes for 9 variants
    const palettes = [
      { robe: '#334155', cowl: '#1e293b', trim: '#94a3b8', eye: '#e2e8f0' }, // 0
      { robe: '#27272a', cowl: '#18181b', trim: '#e4e4e7', eye: '#ffffff' }, // 1
      { robe: '#451a03', cowl: '#291002', trim: '#d97706', eye: '#fef08a' }, // 2
      { robe: '#172554', cowl: '#0f172a', trim: '#60a5fa', eye: '#93c5fd' }, // 3
      { robe: '#4c0519', cowl: '#2d030f', trim: '#f43f5e', eye: '#fecdd3' }, // 4
      { robe: '#064e3b', cowl: '#022c22', trim: '#34d399', eye: '#a7f3d0' }, // 5
      { robe: '#312e81', cowl: '#1e1b4b', trim: '#a5b4fc', eye: '#e0e7ff' }, // 6
      { robe: '#713f12', cowl: '#452509', trim: '#fbbf24', eye: '#fef08a' }, // 7
      { robe: '#1c1917', cowl: '#0c0a09', trim: '#c49850', eye: '#fbbf24' }  // 8
    ];
    const pal = palettes[w.variant % palettes.length];

    let bob = 0;
    let bowY = 0;
    let bowRot = 0;
    let legOffset = 0;

    if (w.state === 'walk') {
      const step = Math.sin(w.walkCycle * 2);
      legOffset = step * 4;
      bob = Math.abs(Math.sin(w.walkCycle * 2)) * 2;
    } else if (w.state === 'pray') {
      const pFrame = (Math.floor(w.prayCycle) % 9) / 8;
      const bow = Math.sin(pFrame * Math.PI);
      bowY = bow * 5;
      bowRot = bow * 0.22;
      bob = -bowY;
    } else {
      bob = Math.sin(w.idleCycle) * 1;
    }

    // Feet
    ctx.fillStyle = '#09090b';
    ctx.fillRect(-5 + legOffset, -3, 4, 3);
    ctx.fillRect(1 - legOffset, -3, 4, 3);

    // Robe Body
    ctx.save();
    ctx.translate(0, -bob);
    if (w.state === 'pray') {
      ctx.rotate(bowRot);
    }

    ctx.fillStyle = pal.robe;
    ctx.beginPath();
    ctx.moveTo(-6, -26);
    ctx.lineTo(6, -26);
    ctx.lineTo(9, -3);
    ctx.lineTo(-9, -3);
    ctx.closePath();
    ctx.fill();

    // Robe gold/silver hem/belt trim
    ctx.strokeStyle = pal.trim;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, -15);
    ctx.lineTo(6, -15);
    ctx.stroke();

    // Cowl / Hood
    ctx.fillStyle = pal.cowl;
    ctx.beginPath();
    ctx.arc(0, -32, 7, 0, Math.PI * 2);
    ctx.fill();

    // Hood peak
    ctx.beginPath();
    ctx.moveTo(-5, -34);
    ctx.lineTo(-9, -38);
    ctx.lineTo(-2, -36);
    ctx.closePath();
    ctx.fill();

    // Face shadow & glowing eye slit
    ctx.fillStyle = '#09090b';
    ctx.fillRect(1, -33, 4, 3);
    ctx.fillStyle = pal.eye;
    ctx.fillRect(2, -32, 2, 1.5);

    // Hands in prayer
    if (w.state === 'pray') {
      ctx.fillStyle = '#d4af37';
      ctx.beginPath();
      ctx.arc(5, -18, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }

  private drawMiracleSpeechBubble(w: Walker, x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();

    const bob = Math.sin(w.breathTimer * 4) * 2.5;
    const pulse = 1 + Math.sin(w.breathTimer * 6) * 0.08;

    const bx = Math.max(24, Math.min(this.width - 24, x));
    const by = Math.max(22, y - 68 + bob);
    const bw = 38 * pulse;
    const bh = 24 * pulse;
    const r = 7 * pulse;

    // Glowing halo behind speech bubble
    ctx.shadowColor = 'rgba(245, 158, 11, 0.9)';
    ctx.shadowBlur = 12;

    // Speech bubble path with bottom pointer/tail
    ctx.beginPath();
    ctx.moveTo(bx - bw / 2 + r, by - bh / 2);
    ctx.lineTo(bx + bw / 2 - r, by - bh / 2);
    ctx.arcTo(bx + bw / 2, by - bh / 2, bx + bw / 2, by + bh / 2, r);
    ctx.lineTo(bx + bw / 2, by + bh / 2 - r);
    ctx.arcTo(bx + bw / 2, by + bh / 2, bx - bw / 2, by + bh / 2, r);

    // Tail pointing down to hood
    ctx.lineTo(bx + 4, by + bh / 2);
    ctx.lineTo(bx, by + bh / 2 + 6);
    ctx.lineTo(bx - 4, by + bh / 2);

    ctx.lineTo(bx - bw / 2 + r, by + bh / 2);
    ctx.arcTo(bx - bw / 2, by + bh / 2, bx - bw / 2, by - bh / 2, r);
    ctx.arcTo(bx - bw / 2, by - bh / 2, bx + bw / 2, by - bh / 2, r);
    ctx.closePath();

    ctx.fillStyle = '#0f172a';
    ctx.fill();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner glowing miracle golden star
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    const starSize = 5;
    ctx.moveTo(bx, by - starSize);
    ctx.quadraticCurveTo(bx, by, bx + starSize, by);
    ctx.quadraticCurveTo(bx, by, bx, by + starSize);
    ctx.quadraticCurveTo(bx, by, bx - starSize, by);
    ctx.quadraticCurveTo(bx, by, bx, by - starSize);
    ctx.fill();

    // Golden divine sparkles around bubble
    const rayDist = 20 * pulse;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + w.breathTimer * 2;
      const rx = bx + Math.cos(angle) * rayDist;
      const ry = by + Math.sin(angle) * (rayDist * 0.7);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.7)';
      ctx.beginPath();
      ctx.arc(rx, ry, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
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
    const loop = () => {
      if (!this.isPaused) {
        this.update();
        this.draw();
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
