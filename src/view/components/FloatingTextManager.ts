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

  public spawn(x: number, y: number, content: number | string, isCritical: boolean = false): void {
    let text = this.pool.pop();
    if (!text) {
      text = new Text({
        text: '',
        style: new TextStyle({
          fontFamily: THEME.fonts.heading,
          fontSize: 16,
          fontWeight: '800',
          fill: THEME.colors.pureWhite,
          stroke: { color: 0x000000, width: 3 },
          align: 'center'
        })
      });
    }

    if (typeof content === 'number') {
      text.text = `+${Formatters.formatNumber(content)} PF`;
      text.style.fill = THEME.colors.pureWhite;
      text.style.fontSize = 18;
    } else {
      text.text = content;
      text.style.fill = THEME.colors.pureWhite;
      text.style.fontSize = 16;
    }

    text.anchor.set(0.5);
    text.position.set(x + (Math.random() * 40 - 20), y + (Math.random() * 20 - 10));
    text.scale.set(isCritical ? 1.4 : 1.0);
    text.alpha = 1.0;

    this.addChild(text);

    this.items.push({
      text,
      vx: (Math.random() - 0.5) * 40,
      vy: typeof content === 'string' ? -90 : -120 - Math.random() * 60,
      alpha: 1.0,
      life: 0,
      maxLife: typeof content === 'string' ? 1.4 : 0.9
    });
  }

  public update(dt: number): void {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life += dt;

      // Linear physics
      item.text.position.x += item.vx * dt;
      item.text.position.y += item.vy * dt;

      // Fade out on second half of life
      const progress = item.life / item.maxLife;
      if (progress > 0.4) {
        item.text.alpha = 1 - (progress - 0.4) / 0.6;
      }

      // Pop and shrink scale slightly
      if (progress < 0.2) {
        const p = progress / 0.2;
        item.text.scale.set(1.0 + 0.2 * Math.sin(p * Math.PI));
      }

      if (item.life >= item.maxLife) {
        this.removeChild(item.text);
        this.pool.push(item.text);
        this.items.splice(i, 1);
      }
    }
  }
}
