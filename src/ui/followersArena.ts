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
  isMiraclePlea?: boolean;
  miracleTimer?: number;
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
  private onMiracleClickCallback?: (clientX: number, clientY: number, walker: Walker) => void;
  private miracleSpawnCooldown: number = 300; // ~5 seconds after game starts
  private spriteSheet: HTMLImageElement | null = null;
  private spriteLoaded: boolean = false;
  private bgImage: HTMLImageElement | null = null;
  private bgLoaded: boolean = false;

  constructor(canvasId: string = 'followers-walk-canvas') {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    this.initCanvas();
    this.loadSprite();
    this.loadBackground();
    this.setupEvents();
    this.startLoop();
  }

  private loadSprite(): void {
    this.spriteSheet = new Image();
    this.spriteSheet.src = '/assets/cultist_spritesheet.png';
    this.spriteSheet.onload = () => {
      this.spriteLoaded = true;
    };
  }

  private loadBackground(): void {
    this.bgImage = new Image();
    this.bgImage.src = '/assets/patio_fieis_bg.jpg';
    this.bgImage.onload = () => {
      this.bgLoaded = true;
    };
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
    w.miracleTimer = 900; // 15 seconds (at 60fps)
    w.state = 'pray';
    w.stateTimer = 900;
    this.spawnPrayerParticles(w, 10);
  }

  public resize(): void {
    const r = this.canvas.getBoundingClientRect();
    if (r.width > 50 && r.height > 50) {
      if (Math.abs(this.width - r.width) > 0.5 || Math.abs(this.height - r.height) > 0.5) {
        this.width = r.width;
        this.height = r.height;
        this.canvas.width = Math.floor(this.width * this.dpr);
        this.canvas.height = Math.floor(this.height * this.dpr);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.dpr, this.dpr);
      }
    }
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
          const dy = (w.y - 34) - clickY;
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
        miracleWalker.stateTimer = 120;
        this.spawnPrayerParticles(miracleWalker, 18);
        if (this.onMiracleClickCallback) {
          this.onMiracleClickCallback(e.clientX, e.clientY, miracleWalker);
        }
        return;
      }

      // 2. Check if clicked near a normal walker
      let hitWalker: Walker | null = null;
      for (const w of this.walkers) {
        const dx = w.x - clickX;
        const dy = w.y - 20 - clickY;
        if (Math.hypot(dx, dy) < 26) {
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

      // Miracle plea timer update
      if (w.isMiraclePlea) {
        w.miracleTimer = (w.miracleTimer || 0) - 1;
        w.state = 'pray';
        w.stateTimer = Math.max(20, w.miracleTimer);
        if (Math.random() < 0.2) {
          this.spawnPrayerParticles(w, 1);
        }
        if (w.miracleTimer <= 0) {
          w.isMiraclePlea = false;
          w.state = 'idle';
          w.stateTimer = 60;
        }
      }

      // Keep within bounds
      w.x = Math.max(pad, Math.min(this.width - pad, w.x));
      w.y = Math.max(minY, Math.min(maxY, w.y));
    }

    // Periodically spawn a miracle plea
    if (this.walkers.length > 0) {
      const hasActiveMiracle = this.walkers.some((w) => w.isMiraclePlea);
      if (!hasActiveMiracle) {
        this.miracleSpawnCooldown -= 1;
        if (this.miracleSpawnCooldown <= 0) {
          this.triggerMiraclePlea();
          // Next miracle in ~35 to 65 seconds (2100 - 3900 frames)
          this.miracleSpawnCooldown = 2100 + Math.floor(Math.random() * 1800);
        }
      }
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

    if (this.bgLoaded && this.bgImage) {
      const imgW = this.bgImage.naturalWidth || this.bgImage.width;
      const imgH = this.bgImage.naturalHeight || this.bgImage.height;

      // Cover-fit keeping the ritual circle nicely centered
      const scale = Math.max(w / imgW, h / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const offsetX = (w - drawW) / 2;
      const offsetY = (h - drawH) / 2;

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.bgImage, offsetX, offsetY, drawW, drawH);

      // Subtle atmospheric vignette & lighting tone to integrate cultist sprites and prayer sparks
      const vignette = ctx.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.25,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.75
      );
      vignette.addColorStop(0, 'rgba(10, 14, 23, 0.1)');
      vignette.addColorStop(1, 'rgba(5, 7, 12, 0.5)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      return;
    }

    // Fallback: subtle stone tile pattern
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

    if (h > 290) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.beginPath();
      ctx.arc(cx, cy, 115, 0, Math.PI * 2);
      ctx.stroke();
    }

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
    const x = Math.round(w.x);
    const y = Math.round(w.y);

    // 1. Drop shadow under feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 10, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw sprite or procedural fallback
    if (this.spriteLoaded && this.spriteSheet) {
      this.drawFollowerSprite(w, x, y);
    } else {
      ctx.save();
      let bob = 0;
      let stepOffset = 0;
      if (w.state === 'walk') {
        bob = Math.abs(Math.sin(w.walkCycle)) * 2;
        stepOffset = Math.sin(w.walkCycle) * 2;
      } else {
        bob = Math.sin(w.breathTimer) * 0.7;
      }
      const spriteY = y - 18 - bob;
      ctx.translate(x, spriteY);
      ctx.scale(w.facing, 1);
      this.renderCultistSprite(w, stepOffset);
      ctx.restore();
    }

    // 3. Draw prayer particles in absolute arena coordinates
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

    // 4. Draw miracle plea speech bubble if asking for miracle
    if (w.isMiraclePlea) {
      this.drawMiracleSpeechBubble(w, x, y);
    }
  }

  private drawMiracleSpeechBubble(w: Walker, x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();

    const bob = Math.sin(w.breathTimer * 4) * 2.5;
    const pulse = 1 + Math.sin(w.breathTimer * 6) * 0.08;

    const bx = x;
    const by = y - 56 + bob;
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

  private drawFollowerSprite(w: Walker, x: number, y: number): void {
    if (!this.spriteSheet) return;
    const ctx = this.ctx;

    let row = 0;
    let col = 0;
    let bob = 0;

    if (w.state === 'walk') {
      row = 0;
      col = Math.floor(w.walkCycle) % 6;
      bob = Math.abs(Math.sin(w.walkCycle)) * 1.2;
    } else if (w.state === 'pray') {
      row = 1;
      // Cycle through praying/kneeling poses smoothly
      col = Math.floor(Math.abs(w.breathTimer * 1.5)) % 6;
      bob = 0;
    } else {
      // Idle breathing
      row = 0;
      col = 0;
      bob = Math.sin(w.breathTimer) * 0.8;
    }

    const frameW = 1024 / 6;
    const frameH = 341 / 2;
    const sx = Math.floor(col * frameW);
    const sy = Math.floor(row * frameH);
    const sw = Math.floor((col + 1) * frameW) - sx;
    const sh = Math.floor((row + 1) * frameH) - sy;

    const destH = 44;
    const destW = Math.round(destH * (sw / sh));

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, y - bob);
    ctx.scale(w.facing, 1);
    ctx.drawImage(this.spriteSheet, sx, sy, sw, sh, -destW / 2, -destH + 2, destW, destH);
    ctx.restore();
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
