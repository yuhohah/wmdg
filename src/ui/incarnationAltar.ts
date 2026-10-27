import { INCARNATION_STAGES, IncarnationStage } from '../config/incarnation.js';
import { getAvatarArt } from './pixelArt.js';

export interface IncarnationAltarOptions {
  onAltarClick?: (e?: MouseEvent) => void;
  triggerHaptic?: (pattern: number | number[]) => void;
}

interface AltarParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export class IncarnationAltar {
  private container: HTMLElement | null;
  private canvas: HTMLCanvasElement | null;
  private ctx: CanvasRenderingContext2D | null = null;
  private nameEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private loreEl: HTMLElement | null = null;

  private currentStage: number = 1;
  private animFrameId: number | null = null;
  private width: number = 380;
  private height: number = 210;
  private dpr: number = 1;

  private particles: AltarParticle[] = [];
  private rotationAngle: number = 0;
  private pulsePhase: number = 0;
  private flashAlpha: number = 0;
  private isOnScreen: boolean = true;
  private options: IncarnationAltarOptions;

  constructor(containerId: string = 'incarnation-altar-container', options: IncarnationAltarOptions = {}) {
    this.options = options;
    this.container = document.getElementById(containerId);
    this.canvas = document.getElementById('incarnation-altar-canvas') as HTMLCanvasElement | null;
    this.nameEl = document.getElementById('incarnation-altar-name');
    this.titleEl = document.getElementById('incarnation-altar-title');
    this.loreEl = document.getElementById('incarnation-altar-lore');

    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.initCanvas();
      this.setupEvents();
      this.startLoop();
    }
  }

  private initCanvas(): void {
    if (!this.canvas) return;
    const cssW = this.canvas.clientWidth || this.canvas.offsetWidth;
    const cssH = this.canvas.clientHeight || this.canvas.offsetHeight;
    this.width = cssW > 50 ? cssW : 400;
    this.height = cssH > 50 ? cssH : 210;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx?.scale(this.dpr, this.dpr);

    window.addEventListener('resize', () => this.resize());
    if (typeof ResizeObserver !== 'undefined' && this.container) {
      const ro = new ResizeObserver(() => this.resize());
      ro.observe(this.container);
    }

    // Skip drawing while the altar is panned off-screen or its card is still sealed
    if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver((entries) => {
        this.isOnScreen = entries[entries.length - 1].isIntersecting;
      }).observe(this.canvas);
    }
  }

  public resize(): void {
    if (!this.canvas || !this.ctx) return;
    const cssW = this.canvas.clientWidth || this.canvas.offsetWidth || 400;
    const cssH = this.canvas.clientHeight || this.canvas.offsetHeight || 210;
    if (cssW > 30 && cssH > 30) {
      if (Math.abs(this.width - cssW) > 0.5 || Math.abs(this.height - cssH) > 0.5) {
        this.width = cssW;
        this.height = cssH;
        this.canvas.width = Math.floor(this.width * this.dpr);
        this.canvas.height = Math.floor(this.height * this.dpr);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.dpr, this.dpr);
      }
    }
  }

  private setupEvents(): void {
    this.container?.addEventListener('click', (e: MouseEvent) => {
      this.triggerAltarClick(e);
    });
  }

  public getCurrentStage(): number {
    return this.currentStage;
  }

  public triggerAltarClick(e?: MouseEvent): void {
    this.options.triggerHaptic?.(12);
    this.options.onAltarClick?.(e);
    this.spawnBurstParticles(15);
    this.pulsePhase = 1.0;
  }

  public setStage(stageNumber: number, silent: boolean = false): void {
    this.currentStage = stageNumber;
    const stageData: IncarnationStage | undefined = INCARNATION_STAGES.find((s) => s.stage === stageNumber);

    if (stageData) {
      if (this.nameEl) this.nameEl.textContent = `Estágio ${stageData.stage}: ${stageData.name}`;
      if (this.titleEl) this.titleEl.textContent = stageData.title;
      if (this.loreEl) this.loreEl.textContent = `"${stageData.lore}"`;
    }

    if (!silent) {
      this.pulsePhase = 1.0;
      this.spawnBurstParticles(25);
    }
  }

  public evolveToStage(stage: number): void {
    this.setStage(stage, false);
    this.flashAlpha = 1.0;
    this.spawnBurstParticles(50);
    this.options.triggerHaptic?.([30, 40, 60]);
  }

  private spawnBurstParticles(count: number): void {
    const cx = this.width / 2;
    const cy = this.height * 0.45;
    const colors = getAvatarArt(this.currentStage).particleColors;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2.8;
      const life = 40 + Math.floor(Math.random() * 40);
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        alpha: 1,
        size: 1.5 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life,
        maxLife: life
      });
    }
  }

  private spawnAmbientParticles(): void {
    if (this.particles.length > 40) return;
    if (Math.random() > 0.35) return;

    const cx = this.width / 2;
    const cy = this.height * 0.5;
    const colors = getAvatarArt(this.currentStage).particleColors;

    this.particles.push({
      x: cx + (Math.random() - 0.5) * (this.width * 0.6),
      y: cy + this.height * 0.35 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.4 - Math.random() * 0.6,
      alpha: 0.8,
      size: 1.2 + Math.random() * 1.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 60 + Math.floor(Math.random() * 40),
      maxLife: 100
    });
  }

  private update(): void {
    this.rotationAngle += 0.006;
    if (this.pulsePhase > 0) {
      this.pulsePhase -= 0.03;
      if (this.pulsePhase < 0) this.pulsePhase = 0;
    }
    if (this.flashAlpha > 0) {
      this.flashAlpha -= 0.025;
      if (this.flashAlpha < 0) this.flashAlpha = 0;
    }

    this.spawnAmbientParticles();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private draw(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const art = getAvatarArt(this.currentStage);
    const sprite = art.sprite;

    // Whole pixels only: the avatar is scaled by an integer factor
    const scale = Math.max(3, Math.floor((h - 26) / sprite.height));
    const spriteW = sprite.width * scale;
    const spriteH = sprite.height * scale;
    const left = Math.round((w - spriteW) / 2);
    const floor = h - 12;
    const breath = Math.sin(this.rotationAngle * 6) > 0.55 ? scale : 0;
    const top = floor - spriteH - breath;
    const headX = w / 2;
    const headY = top + 9 * scale;

    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    // 1. Stage aura behind the figure
    if (art.aura === 'solar') {
      ctx.save();
      ctx.translate(headX, headY);
      ctx.rotate(this.rotationAngle);
      ctx.fillStyle = 'rgba(255, 211, 107, 0.35)';
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.fillRect(-scale / 2, -spriteH * 0.62, scale, spriteH * (i % 2 ? 0.22 : 0.32));
      }
      ctx.restore();
    } else if (art.aura === 'eclipse') {
      const r = 11 * scale;
      ctx.fillStyle = 'rgba(184, 176, 224, 0.55)';
      ctx.beginPath();
      ctx.arc(headX, headY, r + scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#050407';
      ctx.beginPath();
      ctx.arc(headX + scale, headY - scale, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (art.aura !== 'none') {
      ctx.strokeStyle = art.aura === 'motes' ? 'rgba(184, 176, 224, 0.35)' : 'rgba(255, 179, 92, 0.3)';
      ctx.lineWidth = scale;
      ctx.beginPath();
      ctx.arc(headX, headY, 9 * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Stone plinth
    ctx.fillStyle = '#1d1712';
    ctx.fillRect(left - 4 * scale, floor, spriteW + 8 * scale, scale * 2);
    ctx.fillStyle = '#2a2119';
    ctx.fillRect(left - 2 * scale, floor - scale, spriteW + 4 * scale, scale);

    // 3. The avatar
    ctx.drawImage(sprite, left, top, spriteW, spriteH);

    // 4. Click pulse
    if (this.pulsePhase > 0) {
      ctx.strokeStyle = `rgba(246, 220, 154, ${this.pulsePhase * 0.6})`;
      ctx.lineWidth = scale;
      ctx.beginPath();
      ctx.arc(headX, top + spriteH / 2, (1 - this.pulsePhase) * spriteH, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Square pixel sparks
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      const size = p.size > 2.4 ? scale : Math.max(2, scale - 1);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), size, size);
    }
    ctx.globalAlpha = 1;

    // 6. Ascension flash
    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 245, 220, ${this.flashAlpha * 0.7})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private startLoop(): void {
    const loop = () => {
      this.update();
      if (this.isOnScreen) this.draw();
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
