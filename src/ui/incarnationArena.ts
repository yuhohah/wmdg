export interface IncarnationParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

export class IncarnationArena {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private width: number = 380;
  private height: number = 240;
  private dpr: number = 1;
  private stage: number = 1;
  private tick: number = 0;
  private particles: IncarnationParticle[] = [];
  private pulseRipples: Array<{ r: number; alpha: number }> = [];
  private onClickCallback?: (x: number, y: number) => void;

  constructor(canvasId: string = 'incarnation-canvas') {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    this.initCanvas();
    this.setupEvents();
    this.startLoop();
  }

  public setOnClickCallback(cb: (x: number, y: number) => void): void {
    this.onClickCallback = cb;
  }

  public setStage(stage: number): void {
    this.stage = Math.max(1, stage);
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

      // Pulse wave and particles at click location
      this.pulseRipples.push({ r: 15, alpha: 1.0 });
      this.spawnBurst(clickX, clickY, 16);

      if (this.onClickCallback) {
        this.onClickCallback(e.clientX, e.clientY);
      }
    });
  }

  private spawnBurst(x: number, y: number, count: number): void {
    const isHighTier = this.stage >= 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2.5;
      this.particles.push({
        x: x + Math.cos(angle) * 10,
        y: y + Math.sin(angle) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.6,
        alpha: 1.0,
        size: 2 + Math.random() * 2.8,
        color: isHighTier ? (Math.random() > 0.4 ? '#fbbf24' : '#ffffff') : '#ffffff'
      });
    }
  }

  private startLoop(): void {
    const loop = () => {
      this.update();
      this.draw();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private update(): void {
    this.tick += 1;

    // Ambient floating prayer embers rising from the sacred patio
    const spawnChance = this.stage >= 2 ? 0.35 : 0.18;
    if (Math.random() < spawnChance) {
      const cx = this.width / 2;
      const cy = this.height / 2 + 50;
      const offset = (Math.random() - 0.5) * 100;
      this.particles.push({
        x: cx + offset,
        y: cy + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.6 - Math.random() * 0.8,
        alpha: 0.9,
        size: 1.5 + Math.random() * 2.2,
        color: this.stage >= 3 ? '#f59e0b' : (this.stage === 2 ? '#fbbf24' : '#e4e4e7')
      });
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.015;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update pulse ripples
    for (let i = this.pulseRipples.length - 1; i >= 0; i--) {
      const r = this.pulseRipples[i];
      r.r += 2.4;
      r.alpha -= 0.025;
      if (r.alpha <= 0) {
        this.pulseRipples.splice(i, 1);
      }
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const cx = Math.round(this.width / 2);
    const cy = Math.round(this.height / 2 + 15);

    // 1. Draw Sanctuary Patio Background (Stone grid & concentric ritual circles identical to Pátio dos Fiéis)
    this.drawSanctuaryPatioBackground(cx, cy);

    // 2. Pulse ripples from clicks
    for (const rip of this.pulseRipples) {
      ctx.save();
      ctx.strokeStyle = this.stage >= 2 ? `rgba(251, 191, 36, ${rip.alpha})` : `rgba(255, 255, 255, ${rip.alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 42, rip.r, rip.r * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw The Grand Cultist Incarnation (Identical figure to Pátio dos Fiéis, but larger and unique)
    this.drawGrandCultistIncarnation(cx, cy);

    // 4. Ambient floating embers / particles
    for (const p of this.particles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawSanctuaryPatioBackground(cx: number, cy: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();

    // Subtle stone tile pattern (same as followers patio)
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

    // Altar stone dais gradient below the grand figure
    const altarGrad = ctx.createRadialGradient(cx, cy + 40, 10, cx, cy + 40, 110);
    if (this.stage >= 2) {
      altarGrad.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
      altarGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.03)');
      altarGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
      altarGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      altarGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
      altarGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = altarGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 40, 110, 48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sacred ritual concentric circles on floor
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = this.stage >= 2 ? 'rgba(245, 158, 11, 0.28)' : 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 40, 75, 32, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = this.stage >= 2 ? 'rgba(245, 158, 11, 0.16)' : 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 40, 95, 40, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (h > 290) {
      ctx.strokeStyle = this.stage >= 2 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 40, 120, 50, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Subtle runic cross on altar center
    ctx.strokeStyle = this.stage >= 2 ? 'rgba(251, 191, 36, 0.25)' : 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy + 40);
    ctx.lineTo(cx + 24, cy + 40);
    ctx.moveTo(cx, cy + 28);
    ctx.lineTo(cx, cy + 52);
    ctx.stroke();

    // Radial runes along outer ring
    const runeCount = 8;
    for (let i = 0; i < runeCount; i++) {
      const angle = (i / runeCount) * Math.PI * 2 + (this.tick * 0.003);
      const rx = cx + Math.cos(angle) * 75;
      const ry = (cy + 40) + Math.sin(angle) * 32;
      ctx.fillStyle = this.stage >= 2 ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(rx - 2, ry - 2, 4, 4);
    }

    ctx.restore();
  }

  /**
   * Renders the Grand Cultist Incarnation:
   * Uses the EXACT SAME anatomical geometry, silhouette, hood cowl, face void,
   * eyes, and robe cut as the Pátio dos Fiéis, but scaled ~4.5x larger and unique!
   */
  private drawGrandCultistIncarnation(cx: number, cy: number): void {
    const ctx = this.ctx;
    const time = this.tick * 0.035;

    // Gentle rhythmic breathing / levitation bob
    const bob = Math.sin(time) * 3.5;
    const figureY = cy - 2 + bob;

    // 1. Drop shadow under feet (scaled with bob)
    const shadowScale = 1 - (bob / 20);
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 42, 34 * shadowScale, 11 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(cx, figureY);

    // Scale ~4.5x to be clearly grand and unique compared to standard 20px walkers
    const scale = 4.4;
    ctx.scale(scale, scale);

    // 2. Halo / Aura (behind head for higher stages)
    if (this.stage >= 2) {
      this.drawDivineHalo(ctx, 0, 3, time);
    }

    // 3. Orbiting Mystic Flames (back half for Stage 3+)
    if (this.stage >= 3) {
      this.drawOrbitingFlames(ctx, 0, 10, time, false);
    }

    // Palette configuration per stage
    let robeColor = '#27272a';
    let hoodColor = '#18181b';
    let trimColor = '#ffffff';
    let eyeColor = '#ffffff';

    if (this.stage === 1) {
      // Neophyte Avatar: Classic deep mystic cultist
      robeColor = '#27272a';
      hoodColor = '#18181b';
      trimColor = '#e4e4e7';
      eyeColor = '#ffffff';
    } else if (this.stage === 2) {
      // Consecrated: Golden trim, radiant holy eyes
      robeColor = '#1c1917';
      hoodColor = '#18181b';
      trimColor = '#fbbf24';
      eyeColor = '#fde047';
    } else if (this.stage === 3) {
      // Illuminated: Deep obsidian robe, fiery gold accents
      robeColor = '#18181b';
      hoodColor = '#09090b';
      trimColor = '#f59e0b';
      eyeColor = '#fef08a';
    } else {
      // Ascendant / Celestial: Transcendent celestial robes
      robeColor = '#0f172a';
      hoodColor = '#020617';
      trimColor = '#38bdf8';
      eyeColor = '#bae6fd';
    }

    // 4. Feet (Cultist boots on stone altar)
    ctx.fillStyle = '#09090b';
    ctx.fillRect(-4, 16, 3, 3);
    ctx.fillRect(1, 16, 3, 3);

    // 5. Robe Body (Iconic trapezoid cut from Followers Arena)
    ctx.fillStyle = robeColor;
    ctx.beginPath();
    ctx.moveTo(-5, 8);
    ctx.lineTo(5, 8);
    ctx.lineTo(7.2, 16.2);
    ctx.lineTo(-7.2, 16.2);
    ctx.closePath();
    ctx.fill();

    // Robe Inner Fold Shading
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.lineTo(1.5, 16.2);
    ctx.lineTo(-1.5, 16.2);
    ctx.closePath();
    ctx.fill();

    // Robe Trim / Belt Cord (Iconic horizontal belt from Followers Arena)
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4.5, 11);
    ctx.lineTo(4.5, 11);
    ctx.stroke();

    // Belt Sash Tassel hanging down
    ctx.beginPath();
    ctx.moveTo(0, 11);
    ctx.lineTo(0, 14);
    ctx.stroke();

    // Stage 2+ Lower Hem Golden Embroidery
    if (this.stage >= 2) {
      ctx.strokeStyle = trimColor;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-6.8, 15.5);
      ctx.lineTo(6.8, 15.5);
      ctx.stroke();
    }

    // 6. Hood / Head (Iconic round head from Followers Arena)
    ctx.fillStyle = hoodColor;
    ctx.beginPath();
    ctx.arc(0, 4, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // 7. Hood Point / Cowl Tip (Iconic cowl point from Followers Arena)
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(-6, -2);
    ctx.lineTo(-2, 4);
    ctx.closePath();
    ctx.fill();

    // 8. Dark Face Void inside hood (Iconic void from Followers Arena)
    ctx.fillStyle = '#050505';
    ctx.beginPath();
    ctx.arc(1.5, 4, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // 9. Glowing Eyes (Iconic piercing eyes from Followers Arena, with subtle pulse)
    const eyePulse = 0.85 + Math.sin(time * 3) * 0.15;
    ctx.fillStyle = eyeColor;
    ctx.globalAlpha = eyePulse;
    ctx.fillRect(2, 3.5, 1.3, 1.3);
    ctx.globalAlpha = 1.0;

    // 10. Sacred Hands / Divine Fragment in hands
    ctx.fillStyle = trimColor;
    ctx.fillRect(1.5, 8.8, 2.5, 2.5);

    // Glowing miniature sphere fragment in clasped hands
    if (this.stage >= 2) {
      const glowGrad = ctx.createRadialGradient(2.7, 10, 0.5, 2.7, 10, 3);
      glowGrad.addColorStop(0, '#ffffff');
      glowGrad.addColorStop(0.6, trimColor);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(2.7, 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 11. Orbiting Mystic Flames (front half for Stage 3+)
    if (this.stage >= 3) {
      this.drawOrbitingFlames(ctx, 0, 10, time, true);
    }

    ctx.restore();
  }

  private drawDivineHalo(ctx: CanvasRenderingContext2D, hx: number, hy: number, time: number): void {
    ctx.save();
    const haloRadius = 7.5;
    const rayCount = this.stage >= 3 ? 8 : 6;

    // Glowing halo ring
    ctx.strokeStyle = this.stage >= 3 ? 'rgba(251, 191, 36, 0.5)' : 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(hx, hy, haloRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating solar rays
    const rot = time * 0.4;
    for (let i = 0; i < rayCount; i++) {
      const angle = rot + (i / rayCount) * Math.PI * 2;
      const innerX = hx + Math.cos(angle) * haloRadius;
      const innerY = hy + Math.sin(angle) * haloRadius;
      const len = 2.2;
      const outerX = hx + Math.cos(angle) * (haloRadius + len);
      const outerY = hy + Math.sin(angle) * (haloRadius + len);

      ctx.strokeStyle = this.stage >= 3 ? 'rgba(252, 211, 77, 0.6)' : 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawOrbitingFlames(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    time: number,
    front: boolean
  ): void {
    const orbCount = this.stage >= 4 ? 3 : 2;
    const radiusX = 10;
    const radiusY = 3.5;

    for (let i = 0; i < orbCount; i++) {
      const angle = time * 1.5 + (i / orbCount) * Math.PI * 2;
      const isFront = Math.sin(angle) > 0;

      if (isFront === front) {
        const x = ox + Math.cos(angle) * radiusX;
        const y = oy + Math.sin(angle) * radiusY;

        ctx.save();
        // Flame glow
        const glowGrad = ctx.createRadialGradient(x, y, 0.5, x, y, 2.8);
        glowGrad.addColorStop(0, '#ffffff');
        glowGrad.addColorStop(0.5, '#f59e0b');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(x, y, 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Core flame
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 1.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
