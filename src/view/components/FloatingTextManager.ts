import { Container, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { Formatters } from '../utils/Formatters';

interface FloatingItem {
  text: Text;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class FloatingTextManager extends Container {
  private items: FloatingItem[] = [];
  private pool: Text[] = [];

  constructor() {
    super();
  }

  public spawn(x: number, y: number, amount: number, isCritical: boolean = false): void {
    let text = this.pool.pop();
    if (!text) {
      text = new Text({
        text: '',
        style: new TextStyle({
          fontFamily: THEME.fonts.numbers,
          fontSize: 18,
          fontWeight: '700',
          fill: THEME.colors.pureWhite,
          stroke: { color: 0x000000, width: 3 },
          align: 'center'
        })
      });
    }

    text.text = `+${Formatters.formatNumber(amount)} PF`;
    text.anchor.set(0.5);
    text.position.set(x + (Math.random() * 40 - 20), y + (Math.random() * 20 - 10));
    text.scale.set(isCritical ? 1.4 : 1.0);
    text.alpha = 1.0;

    this.addChild(text);

    this.items.push({
      text,
      vx: (Math.random() - 0.5) * 40,
      vy: -120 - Math.random() * 60,
      alpha: 1.0,
      life: 0,
      maxLife: 0.9
    });
  }

  public update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life += dt;

      // Move
      item.text.position.x += item.vx * dt;
      item.text.position.y += item.vy * dt;

      // Slow down upward velocity
      item.vy += 80 * dt;

      // Fade out
      const progress = item.life / item.maxLife;
      item.text.alpha = Math.max(0, 1 - Math.pow(progress, 2));

      // Scale slight pulsation
      item.text.scale.x = 1 + (1 - progress) * 0.2;
      item.text.scale.y = item.text.scale.x;

      if (item.life >= item.maxLife) {
        this.removeChild(item.text);
        this.pool.push(item.text);
        this.items.splice(i, 1);
      }
    }
  }
}
