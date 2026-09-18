export interface Walker {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  facing: number; // 1 = right, -1 = left
  variant: number; // 0..4
  state: 'walk' | 'idle' | 'pray';
  stateTimer: number;
  walkCycle: number;
  breathTimer: number;
  prayParticles: Array<{ x: number; y: number; vy: number; alpha: number; size: number }>;
}

export class FollowersArena {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private walkers: Walker[] = [];
  private nextId: number = 1;
  private animFrameId: number | null = null;
  private width: number = 380;
  private height: number = 220;
  private dpr: number = 1;
  private onFollowerClickCallback?: (x: number, y: number) => void;

  constructor(canvasId: string = 'followers-walk-canvas') {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    this.initCanvas();
    this.setupEvents();
    this.startLoop();
  }

  public setOnClickCallback(cb: (x: number, y: number) => void): void {
    this.onFollowerClickCallback = cb;
  }

  private initCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width > 50 ? rect.width : 400;
    this.height = rect.height > 50 ? rect.height : 220;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.scale(this.dpr, this.dpr);

    window.addEventListener('resize', () => {
      const r = this.canvas.getBoundingClientRect();
      if (r.width > 50 && r.height > 50) {
        this.width = r.width;
        this.height = r.height;
        this.canvas.width = Math.floor(this.width * this.dpr);
        this.canvas.height = Math.floor(this.height * this.dpr);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.dpr, this.dpr);
      }
    });
  }

  private setupEvents(): void {
    this.canvas.addEventListener('click', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Check if clicked near a walker
      let hitWalker: Walker | null = null;
      for (const w of this.walkers) {
        const dx = w.x - clickX;
        const dy = w.y - 10 - clickY;
        if (Math.hypot(dx, dy) < 22) {
          hitWalker = w;
          break;
        }
      }

      if (hitWalker) {
        hitWalker.state = 'pray';
        hitWalker.stateTimer = 90;
        this.spawnPrayerParticles(hitWalker, 6);
        if (this.onFollowerClickCallback) {
          this.onFollowerClickCallback(e.clientX, e.clientY);
        }
      } else {
        // Spurt a prayer in nearest walker
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
    // Show up to 35 active walker sprites so performance and aesthetics remain optimal
    const targetCount = Math.min(totalCount, 35);
    while (this.walkers.length < targetCount) {
      this.addWalker();
    }
    while (this.walkers.length > targetCount) {
      this.walkers.pop();
    }
  }

  public onFollowersAdded(addedCount: number): void {
    const spawnCount = Math.min(addedCount, 8);
    for (let i = 0; i < spawnCount; i++) {
      if (this.walkers.length < 35) {
        const w = this.addWalker(true);
        this.spawnPrayerParticles(w, 8);
      }
    }
  }

  private addWalker(atEdge: boolean = false): Walker {
    const pad = 24;
    let x = pad + Math.random() * (this.width - pad * 2);
    let y = 35 + Math.random() * (this.height - 55);

    if (atEdge) {
      x = Math.random() > 0.5 ? pad : this.width - pad;
      y = 40 + Math.random() * (this.height - 60);
    }

    const walker: Walker = {
      id: this.nextId++,
      x,
      y,
      vx: 0,
      vy: 0,
      targetX: pad + Math.random() * (this.width - pad * 2),
      targetY: 35 + Math.random() * (this.height - 55),
      facing: Math.random() > 0.5 ? 1 : -1,
      variant: Math.floor(Math.random() * 5),
      state: 'walk',
      stateTimer: 60 + Math.floor(Math.random() * 120),
      walkCycle: Math.random() * 10,
      breathTimer: Math.random() * 100,
      prayParticles: []
    };

    this.walkers.push(walker);
    return walker;
  }

  private spawnPrayerParticles(w: Walker, count: number): void {
    for (let i = 0; i < count; i++) {
      w.prayParticles.push({
        x: w.x + (Math.random() - 0.5) * 12,
        y: w.y - 16 - Math.random() * 6,
        vy: -0.6 - Math.random() * 0.8,
        alpha: 1.0,
        size: 1.5 + Math.random() * 1.5
      });
    }
  }

  private update(): void {
    const pad = 20;
    const minY = 30;
    const maxY = this.height - 20;

    for (const w of this.walkers) {
      w.stateTimer -= 1;
      w.breathTimer += 0.05;

      // Update prayer particles
      for (let i = w.prayParticles.length - 1; i >= 0; i--) {
        const p = w.prayParticles[i];
        p.y += p.vy;
        p.alpha -= 0.02;
        if (p.alpha <= 0) {
          w.prayParticles.splice(i, 1);
        }
      }

      if (w.stateTimer <= 0) {
        // Change state
        const rand = Math.random();
        if (rand < 0.6) {
          w.state = 'walk';
          w.stateTimer = 90 + Math.floor(Math.random() * 180);
          w.targetX = pad + Math.random() * (this.width - pad * 2);
          w.targetY = minY + Math.random() * (maxY - minY);
        } else if (rand < 0.85) {
          w.state = 'idle';
          w.stateTimer = 60 + Math.floor(Math.random() * 100);
        } else {
          w.state = 'pray';
          w.stateTimer = 80 + Math.floor(Math.random() * 80);
          this.spawnPrayerParticles(w, 4);
        }
      }

      if (w.state === 'walk') {
        const dx = w.targetX - w.x;
        const dy = w.targetY - w.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 3) {
          const speed = 0.55 + (w.variant % 3) * 0.15;
          w.vx = (dx / dist) * speed;
          w.vy = (dy / dist) * speed;
          w.x += w.vx;
          w.y += w.vy;
          w.facing = w.vx >= 0 ? 1 : -1;
          w.walkCycle += 0.15;
        } else {
          w.state = 'idle';
          w.stateTimer = 40 + Math.floor(Math.random() * 60);
        }
      } else if (w.state === 'pray') {
        if (Math.random() < 0.1) {
          this.spawnPrayerParticles(w, 1);
        }
      }

      // Keep within bounds
      w.x = Math.max(pad, Math.min(this.width - pad, w.x));
      w.y = Math.max(minY, Math.min(maxY, w.y));
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw ritual stone patio background
    this.drawPatioBackground();

    // 2. Sort walkers by Y position for proper isometric depth rendering
    const sorted = [...this.walkers].sort((a, b) => a.y - b.y);

    // 3. Render walkers
    for (const w of sorted) {
      this.drawWalker(w);
    }
  }

  private drawPatioBackground(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Subtle stone tile pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;

    const tileSize = 28;
    for (let x = 0; x < w; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Sacred ritual concentric circle on floor
    const cx = w / 2;
    const cy = h / 2 + 10;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.arc(cx, cy, 85, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle runic cross
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy);
    ctx.lineTo(cx + 20, cy);
    ctx.moveTo(cx, cy - 20);
    ctx.lineTo(cx, cy + 20);
    ctx.stroke();
    ctx.restore();
  }

  private drawWalker(w: Walker): void {
    const ctx = this.ctx;
    ctx.save();

    const x = Math.round(w.x);
    const y = Math.round(w.y);

    // 1. Drop shadow under feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bobbing & stepping offset
    let bob = 0;
    let stepOffset = 0;
    if (w.state === 'walk') {
      bob = Math.abs(Math.sin(w.walkCycle)) * 2;
      stepOffset = Math.sin(w.walkCycle) * 2;
    } else {
      bob = Math.sin(w.breathTimer) * 0.7;
    }

    const spriteY = y - 18 - bob;

    // Direction flip
    ctx.translate(x, spriteY);
    ctx.scale(w.facing, 1);

    // 2. Draw procedural cultist sprite
    this.renderCultistSprite(w, stepOffset);

    ctx.restore();

    // 3. Draw prayer particles in absolute arena coordinates
    if (w.prayParticles.length > 0) {
      for (const p of w.prayParticles) {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderCultistSprite(w: Walker, step: number): void {
    const ctx = this.ctx;
    const v = w.variant;

    // Color palettes (Monochrome & subtle mystical accents)
    const palettes = [
      { robe: '#3f3f46', hood: '#27272a', trim: '#a1a1aa', eye: '#ffffff' }, // 0: Noviço
      { robe: '#27272a', hood: '#18181b', trim: '#ffffff', eye: '#f4f4f5' }, // 1: Devoto
      { robe: '#18181b', hood: '#09090b', trim: '#71717a', eye: '#e4e4e7' }, // 2: Penitente
      { robe: '#52525b', hood: '#3f3f46', trim: '#d4d4d8', eye: '#ffffff' }, // 3: Sábio
      { robe: '#27272a', hood: '#1c1917', trim: '#ffffff', eye: '#ffffff' }  // 4: Fanático
    ];

    const p = palettes[v % palettes.length];

    // Feet (walking alternation)
    ctx.fillStyle = '#09090b';
    ctx.fillRect(-4 + step, 16, 3, 3);
    ctx.fillRect(1 - step, 16, 3, 3);

    // Robe Body
    ctx.fillStyle = p.robe;
    ctx.beginPath();
    ctx.moveTo(-5, 8);
    ctx.lineTo(5, 8);
    ctx.lineTo(7, 16);
    ctx.lineTo(-7, 16);
    ctx.closePath();
    ctx.fill();

    // Robe Trim / Belt Cord
    ctx.strokeStyle = p.trim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, 11);
    ctx.lineTo(4, 11);
    ctx.stroke();

    // Hood / Head
    ctx.fillStyle = p.hood;
    ctx.beginPath();
    ctx.arc(0, 4, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Hood Point / Cowl Tip
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(-6, -2);
    ctx.lineTo(-2, 4);
    ctx.closePath();
    ctx.fill();

    // Dark Face Void inside hood
    ctx.fillStyle = '#050505';
    ctx.beginPath();
    ctx.arc(1.5, 4, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Glowing Eyes
    ctx.fillStyle = p.eye;
    ctx.fillRect(2, 3.5, 1.2, 1.2);

    // Variant Specific Relics / Props
    if (v === 0) {
      // Candle & little flickering flame
      ctx.fillStyle = '#d4d4d8';
      ctx.fillRect(4, 8, 2, 4); // candle stem
      ctx.fillStyle = '#ffffff';
      const flameFlicker = Math.sin(w.walkCycle * 4) * 0.8;
      ctx.beginPath();
      ctx.arc(5, 6 + flameFlicker, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (v === 1) {
      // Clasped hands in prayer
      ctx.fillStyle = p.trim;
      ctx.fillRect(2, 9, 2.5, 2.5);
    } else if (v === 2) {
      // Shoulder chains
      ctx.strokeStyle = '#a1a1aa';
      ctx.beginPath();
      ctx.moveTo(-4, 7);
      ctx.lineTo(3, 9);
      ctx.stroke();
    } else if (v === 3) {
      // Sacred Parchment Scroll
      ctx.fillStyle = '#e4e4e7';
      ctx.fillRect(3, 9, 3.5, 5);
      ctx.fillStyle = '#18181b';
      ctx.fillRect(4, 11, 2, 1);
    } else if (v === 4) {
      // Swinging censer
      const sway = Math.sin(w.walkCycle * 2) * 3;
      ctx.strokeStyle = '#a1a1aa';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(3, 8);
      ctx.lineTo(5 + sway, 13);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(5 + sway, 14, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Praying State Arm Gestures
    if (w.state === 'pray') {
      ctx.strokeStyle = p.trim;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(1, 8);
      ctx.lineTo(5, 3);
      ctx.stroke();
    }
  }

  private loop = (): void => {
    this.update();
    this.draw();
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  public startLoop(): void {
    if (!this.animFrameId) {
      this.animFrameId = requestAnimationFrame(this.loop);
    }
  }

  public stopLoop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public destroy(): void {
    this.stopLoop();
  }
}
