import { Container, Graphics } from 'pixi.js';
import { THEME } from '../theme';

interface Star {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
  baseAlpha: number;
  color: number;
}

export class BackgroundStars extends Container {
  private stars: Star[] = [];
  private graphics: Graphics;
  private monumentsGraphics: Graphics;
  private screenWidth: number = 800;
  private screenHeight: number = 600;
  private monumentsCount: number = 0;

  constructor() {
    super();
    this.graphics = new Graphics();
    this.addChild(this.graphics);

    this.monumentsGraphics = new Graphics();
    this.addChild(this.monumentsGraphics);
  }

  public resize(w: number, h: number): void {
    this.screenWidth = w;
    this.screenHeight = h;
    this.initStars(50);
  }

  public setMonumentsCount(count: number): void {
    this.monumentsCount = count;
  }

  private initStars(count: number): void {
    this.stars = [];
    const colors = [THEME.colors.pureWhite, THEME.colors.silverLight, THEME.colors.silver, THEME.colors.silverDark];

    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.screenWidth,
        y: Math.random() * this.screenHeight,
        radius: 1 + Math.random() * 2,
        speed: 5 + Math.random() * 15,
        alpha: Math.random(),
        baseAlpha: 0.2 + Math.random() * 0.5,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  public update(dt: number): void {
    // 1. Draw Starfield
    this.graphics.clear();

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      star.y -= star.speed * dt;
      if (star.y < 0) {
        star.y = this.screenHeight;
        star.x = Math.random() * this.screenWidth;
      }

      const pulse = Math.sin(performance.now() * 0.002 + i) * 0.2;
      const currentAlpha = Math.max(0.1, Math.min(1, star.baseAlpha + pulse));

      this.graphics.circle(star.x, star.y, star.radius);
      this.graphics.fill({ color: star.color, alpha: currentAlpha });
    }

    // 2. Draw Background Cosmic Monuments based on monumentsCount
    this.drawBackgroundMonuments();
  }

  private drawBackgroundMonuments(): void {
    this.monumentsGraphics.clear();
    if (this.monumentsCount <= 0) return;

    const now = performance.now();
    const w = this.screenWidth;
    const h = this.screenHeight;

    // Monument 1: Monólito da Aurora (Left Horizon)
    if (this.monumentsCount >= 1) {
      const m1X = w * 0.12;
      const m1Y = h * 0.72;
      const pulse1 = Math.sin(now * 0.002) * 2;

      // Vertical Starlight Beam
      this.monumentsGraphics.rect(m1X - 3, 0, 6, m1Y);
      this.monumentsGraphics.fill({ color: THEME.colors.pureWhite, alpha: 0.08 + Math.sin(now * 0.003) * 0.04 });

      // Monolith Pillar Body
      this.monumentsGraphics.poly([
        m1X - 14, m1Y,
        m1X - 10, m1Y - 120 + pulse1,
        m1X, m1Y - 140 + pulse1,
        m1X + 10, m1Y - 120 + pulse1,
        m1X + 14, m1Y
      ]);
      this.monumentsGraphics.fill({ color: 0x0c0c0c, alpha: 0.45 });
      this.monumentsGraphics.stroke({ width: 1.5, color: THEME.colors.silverLight, alpha: 0.5 });

      // Core Diamond Rune
      this.monumentsGraphics.poly([
        m1X, m1Y - 90 + pulse1,
        m1X + 6, m1Y - 80 + pulse1,
        m1X, m1Y - 70 + pulse1,
        m1X - 6, m1Y - 80 + pulse1
      ]);
      this.monumentsGraphics.fill({ color: THEME.colors.pureWhite, alpha: 0.7 });
    }

    // Monument 2: Obelisco da Eternidade (Right Horizon)
    if (this.monumentsCount >= 2) {
      const m2X = w * 0.88;
      const m2Y = h * 0.70;
      const pulse2 = Math.sin(now * 0.0025 + 1) * 3;

      // Celestial Ring Arc
      this.monumentsGraphics.circle(m2X, m2Y - 90 + pulse2, 28);
      this.monumentsGraphics.stroke({ width: 1, color: THEME.colors.silverLight, alpha: 0.35 });

      // Obelisk Spire Body
      this.monumentsGraphics.poly([
        m2X - 16, m2Y,
        m2X - 8, m2Y - 130 + pulse2,
        m2X, m2Y - 155 + pulse2,
        m2X + 8, m2Y - 130 + pulse2,
        m2X + 16, m2Y
      ]);
      this.monumentsGraphics.fill({ color: 0x0e0e0e, alpha: 0.45 });
      this.monumentsGraphics.stroke({ width: 1.5, color: THEME.colors.pureWhite, alpha: 0.5 });
    }

    // Monument 3: Torre dos Céus (Mid-Left Horizon)
    if (this.monumentsCount >= 3) {
      const m3X = w * 0.28;
      const m3Y = h * 0.76;
      const pulse3 = Math.sin(now * 0.0018 + 2) * 2;

      // Multi-tiered Tower
      this.monumentsGraphics.roundRect(m3X - 22, m3Y - 60, 44, 60, 4);
      this.monumentsGraphics.roundRect(m3X - 16, m3Y - 110, 32, 50, 4);
      this.monumentsGraphics.roundRect(m3X - 10, m3Y - 150 + pulse3, 20, 40, 4);
      this.monumentsGraphics.fill({ color: 0x0a0a0a, alpha: 0.4 });
      this.monumentsGraphics.stroke({ width: 1.5, color: THEME.colors.silverLight, alpha: 0.45 });

      // Observatory Dome Apex
      this.monumentsGraphics.circle(m3X, m3Y - 155 + pulse3, 8);
      this.monumentsGraphics.fill({ color: THEME.colors.pureWhite, alpha: 0.6 });
    }

    // Monument 4: Pirâmide da Ascensão (Mid-Right Horizon)
    if (this.monumentsCount >= 4) {
      const m4X = w * 0.72;
      const m4Y = h * 0.74;
      const pulse4 = Math.sin(now * 0.0022 + 3) * 4;

      // Floating Geometric Pyramid
      this.monumentsGraphics.poly([
        m4X - 35, m4Y - pulse4,
        m4X, m4Y - 70 - pulse4,
        m4X + 35, m4Y - pulse4
      ]);
      this.monumentsGraphics.fill({ color: 0x101010, alpha: 0.5 });
      this.monumentsGraphics.stroke({ width: 1.5, color: THEME.colors.pureWhite, alpha: 0.6 });

      // Internal Glowing Core
      this.monumentsGraphics.circle(m4X, m4Y - 25 - pulse4, 6);
      this.monumentsGraphics.fill({ color: THEME.colors.pureWhite, alpha: 0.8 });
    }

    // Monument 5: Colosso da Devoção (Far Left Horizon)
    if (this.monumentsCount >= 5) {
      const m5X = w * 0.06;
      const m5Y = h * 0.65;
      const pulse5 = Math.sin(now * 0.0015 + 4) * 2;

      // Titanic Statue Silhouette
      this.monumentsGraphics.circle(m5X, m5Y - 130 + pulse5, 14); // Head
      this.monumentsGraphics.circle(m5X, m5Y - 130 + pulse5, 20); // Halo arc
      this.monumentsGraphics.stroke({ width: 1, color: THEME.colors.pureWhite, alpha: 0.4 });

      this.monumentsGraphics.poly([
        m5X - 25, m5Y,
        m5X - 18, m5Y - 110 + pulse5,
        m5X + 18, m5Y - 110 + pulse5,
        m5X + 25, m5Y
      ]);
      this.monumentsGraphics.fill({ color: 0x090909, alpha: 0.45 });
      this.monumentsGraphics.stroke({ width: 1.5, color: THEME.colors.silverLight, alpha: 0.45 });
    }

    // Monument 6: Farol Cósmico (Far Right Horizon)
    if (this.monumentsCount >= 6) {
      const m6X = w * 0.94;
      const m6Y = h * 0.64;
      const angle6 = (now * 0.001) % (Math.PI * 2);

      // Rotating Twin Beams of Cosmic Light
      const beamX1 = m6X + Math.cos(angle6) * 160;
      const beamY1 = (m6Y - 140) + Math.sin(angle6) * 60;
      const beamX2 = m6X - Math.cos(angle6) * 160;
      const beamY2 = (m6Y - 140) - Math.sin(angle6) * 60;

      this.monumentsGraphics.moveTo(m6X, m6Y - 140);
      this.monumentsGraphics.lineTo(beamX1, beamY1);
      this.monumentsGraphics.stroke({ width: 2, color: THEME.colors.pureWhite, alpha: 0.35 });

      this.monumentsGraphics.moveTo(m6X, m6Y - 140);
      this.monumentsGraphics.lineTo(beamX2, beamY2);
      this.monumentsGraphics.stroke({ width: 2, color: THEME.colors.pureWhite, alpha: 0.35 });

      // Beacon Spire Base
      this.monumentsGraphics.poly([
        m6X - 15, m6Y,
        m6X - 8, m6Y - 140,
        m6X + 8, m6Y - 140,
        m6X + 15, m6Y
      ]);
      this.monumentsGraphics.fill({ color: 0x0d0d0d, alpha: 0.45 });
      this.monumentsGraphics.stroke({ width: 1.5, color: THEME.colors.pureWhite, alpha: 0.5 });
    }

    // Monument 7: Trono Divino (Top Center Cosmic Zenith)
    if (this.monumentsCount >= 7) {
      const m7X = w * 0.50;
      const m7Y = h * 0.18;
      const pulse7 = Math.sin(now * 0.002) * 3;

      // Cosmic Halos & Orbits around Divine Throne
      this.monumentsGraphics.circle(m7X, m7Y, 40 + pulse7);
      this.monumentsGraphics.stroke({ width: 1, color: THEME.colors.pureWhite, alpha: 0.3 });

      this.monumentsGraphics.circle(m7X, m7Y, 65 + pulse7 * 1.5);
      this.monumentsGraphics.stroke({ width: 1, color: THEME.colors.silverLight, alpha: 0.2 });

      // Throne Crown / Apex Seat
      this.monumentsGraphics.poly([
        m7X - 20, m7Y + 15,
        m7X - 15, m7Y - 20,
        m7X, m7Y - 35,
        m7X + 15, m7Y - 20,
        m7X + 20, m7Y + 15
      ]);
      this.monumentsGraphics.fill({ color: 0x141414, alpha: 0.6 });
      this.monumentsGraphics.stroke({ width: 2, color: THEME.colors.pureWhite, alpha: 0.75 });

      // Glowing Supreme Star Core
      this.monumentsGraphics.circle(m7X, m7Y - 5, 8);
      this.monumentsGraphics.fill({ color: THEME.colors.pureWhite, alpha: 0.95 });
    }
  }
}
