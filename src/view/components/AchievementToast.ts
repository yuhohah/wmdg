import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';

export interface ToastItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export class AchievementToast extends Container {
  private queue: ToastItem[] = [];
  private currentToast: Container | null = null;
  private currentTimer: number = 0;
  private readonly toastDuration: number = 3.8;
  private screenW: number = 1000;

  constructor() {
    super();
    this.eventMode = 'none';
  }

  public resize(width: number, _height?: number): void {
    this.screenW = width;
    if (this.currentToast) {
      this.repositionToast(this.currentToast);
    }
  }

  public notify(item: ToastItem): void {
    this.queue.push(item);
    if (!this.currentToast) {
      this.showNext();
    }
  }

  private showNext(): void {
    if (this.queue.length === 0) {
      this.currentToast = null;
      return;
    }

    const item = this.queue.shift()!;
    const toast = new Container();

    const toastW = Math.min(360, this.screenW - 40);
    const toastH = 72;

    // Background Card
    const bg = new Graphics();
    bg.roundRect(0, 0, toastW, toastH, 14);
    bg.fill({ color: 0x0a0a0a, alpha: 0.96 });
    bg.stroke({ width: 1.5, color: THEME.colors.pureWhite });

    // Inner top highlight line
    bg.roundRect(2, 2, toastW - 4, 1.5, 6);
    bg.fill({ color: THEME.colors.pureWhite, alpha: 0.3 });
    toast.addChild(bg);

    // Icon Sprite
    const icon = Sprite.from(item.icon || '/assets/icons/icon_star.png');
    icon.width = 36;
    icon.height = 36;
    icon.position.set(16, (toastH - 36) / 2);
    toast.addChild(icon);

    // Header Label: 🏆 CONQUISTA DESBLOQUEADA!
    const header = new Text({
      text: '🏆 CONQUISTA DESBLOQUEADA!',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.2,
        fill: THEME.colors.silverLight
      })
    });
    header.position.set(62, 12);
    toast.addChild(header);

    // Achievement Title
    const title = new Text({
      text: item.title,
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 14,
        fontWeight: '800',
        fill: THEME.colors.pureWhite
      })
    });
    title.position.set(62, 28);
    toast.addChild(title);

    // Achievement Description
    const desc = new Text({
      text: item.description,
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 10,
        fontWeight: '500',
        fill: THEME.colors.silverDark,
        wordWrap: true,
        wordWrapWidth: toastW - 74
      })
    });
    desc.position.set(62, 48);
    toast.addChild(desc);

    this.currentToast = toast;
    this.currentTimer = this.toastDuration;

    this.repositionToast(toast);
    toast.alpha = 0;
    toast.position.y += 20; // slide up effect
    this.addChild(toast);
  }

  private repositionToast(toast: Container): void {
    const toastW = Math.min(360, this.screenW - 40);
    // Position at top-right or bottom-right
    const targetX = Math.max(20, this.screenW - toastW - 24);
    const targetY = 24;
    toast.position.x = targetX;
    toast.position.y = targetY;
  }

  public update(dt: number): void {
    if (!this.currentToast) return;

    this.currentTimer -= dt;
    const elapsed = this.toastDuration - this.currentTimer;

    // Slide in & fade in (first 0.3s)
    if (elapsed < 0.3) {
      const p = elapsed / 0.3;
      this.currentToast.alpha = p;
    }
    // Slide out & fade out (last 0.4s)
    else if (this.currentTimer < 0.4) {
      const p = Math.max(0, this.currentTimer / 0.4);
      this.currentToast.alpha = p;
    } else {
      this.currentToast.alpha = 1.0;
    }

    if (this.currentTimer <= 0) {
      this.removeChild(this.currentToast);
      this.currentToast = null;
      this.showNext();
    }
  }
}
