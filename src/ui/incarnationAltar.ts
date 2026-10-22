import { INCARNATION_STAGES, IncarnationStage } from '../config/incarnation.js';

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
  private imgEl: HTMLImageElement | null = null;
  private nameEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private loreEl: HTMLElement | null = null;

  private currentStage: number = 1;
  private animFrameId: number | null = null;
  private width: number = 380;
  private height: number = 240;
  private dpr: number = 1;

  private particles: AltarParticle[] = [];
  private rotationAngle: number = 0;
  private pulsePhase: number = 0;
  private flashAlpha: number = 0;
  private options: IncarnationAltarOptions;

  constructor(containerId: string = 'incarnation-altar-container', options: IncarnationAltarOptions = {}) {
    this.options = options;
    this.container = document.getElementById(containerId);
    this.canvas = document.getElementById('incarnation-altar-canvas') as HTMLCanvasElement | null;
    this.imgEl = document.getElementById('incarnation-avatar-art') as HTMLImageElement | null;
    this.nameEl = document.getElementById('incarnation-altar-name');
    this.titleEl = document.getElementById('incarnation-altar-title');
    this.loreEl = document.getElementById('incarnation-altar-lore');

    if (this.imgEl) {
      this.imgEl.onerror = () => {
        if (this.imgEl) this.imgEl.style.display = 'none';
      };
    }

    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.initCanvas();
      this.setupEvents();
      this.startLoop();
    }
  }

  private initCanvas(): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width > 50 ? rect.width : 400;
    this.height = rect.height > 50 ? rect.height : 440;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx?.scale(this.dpr, this.dpr);

    window.addEventListener('resize', () => this.resize());
    if (typeof ResizeObserver !== 'undefined' && this.container) {
      const ro = new ResizeObserver(() => this.resize());
      ro.observe(this.container);
    }
  }

  public resize(): void {
    if (!this.canvas || !this.ctx) return;
    const r = this.canvas.getBoundingClientRect();
    if (r.width > 30 && r.height > 30) {
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

    if (this.imgEl) {
      this.imgEl.src = `/assets/incarnation/stage_${stageNumber}.jpg`;
      this.imgEl.alt = stageData ? stageData.name : `Avatar Estágio ${stageNumber}`;
      this.imgEl.style.display = 'block';
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
    const colors = ['#f4deb3', '#e4c382', '#ffd700', '#d88b48', '#ffffff'];

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
    const colors = ['#f4deb3', '#c49850', '#e5d4b4'];

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
    const cx = w / 2;
    const cy = h * 0.48;

    ctx.clearRect(0, 0, w, h);

    // 1. Concentric Hermetic Astrolabe Rings behind/over the altar
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotationAngle);

    const baseRadius = Math.min(w, h) * 0.42;

    // Outer sacred ring
    ctx.strokeStyle = 'rgba(216, 191, 141, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Intermediate dashed zodiac ring
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(216, 191, 141, 0.16)';
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4 cardinal rays
    ctx.strokeStyle = 'rgba(216, 191, 141, 0.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (baseRadius * 0.7), Math.sin(a) * (baseRadius * 0.7));
      ctx.lineTo(Math.cos(a) * (baseRadius * 1.05), Math.sin(a) * (baseRadius * 1.05));
      ctx.stroke();
    }

    ctx.restore();

    // Procedural central divine sphere (rendered if avatar art is hidden/missing or as occult core)
    const isImgHidden = !this.imgEl || this.imgEl.style.display === 'none';
    if (isImgHidden) {
      ctx.save();
      ctx.translate(cx, cy);
      const orbRadius = baseRadius * 0.38;
      const grad = ctx.createRadialGradient(-orbRadius * 0.25, -orbRadius * 0.25, 2, 0, 0, orbRadius);
      grad.addColorStop(0, '#fffbe8');
      grad.addColorStop(0.3, '#d8aa50');
      grad.addColorStop(0.7, '#784618');
      grad.addColorStop(1, '#1b120c');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, orbRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(244, 222, 179, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Astrological orbit ring around orb
      ctx.strokeStyle = 'rgba(216, 191, 141, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, orbRadius * 1.25, orbRadius * 0.45, this.rotationAngle * 1.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // 2. Click pulse wave if active
    if (this.pulsePhase > 0) {
      ctx.save();
      const waveRadius = (1 - this.pulsePhase) * (baseRadius * 1.3);
      ctx.strokeStyle = `rgba(244, 222, 179, ${this.pulsePhase * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Ethereal Particles / Sparks
    for (const p of this.particles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Ascension Flash
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 245, 220, ${this.flashAlpha * 0.7})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
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
      this.animFrameId = null;
    }
  }
}
