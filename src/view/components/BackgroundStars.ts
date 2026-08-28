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
  private screenWidth: number = 800;
  private screenHeight: number = 600;

  constructor() {
    super();
    this.graphics = new Graphics();
    this.addChild(this.graphics);
  }

  public resize(w: number, h: number): void {
    this.screenWidth = w;
    this.screenHeight = h;
    this.initStars(45);
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
  }
}
