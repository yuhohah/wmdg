import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { Formatters } from '../utils/Formatters';

export class ResourceCard extends Container {
  private bgGraphics: Graphics;
  private headerLabel: Text;

  // Faith row
  private faithSprite: Sprite;
  private faithValueText: Text;
  private faithRateText: Text;

  // Faithful row
  private fielSprite: Sprite;
  private fielValueText: Text;

  // Temples row (visible once unlocked)
  private temploContainer: Container;
  private temploSprite: Sprite;
  private temploValueText: Text;

  private currentDisplayFaith: number = 0;
  private targetFaith: number = 0;
  private widthPx: number;

  constructor(width: number = 260) {
    super();
    this.widthPx = width;

    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);

    // 1. Header: RECURSOS
    this.headerLabel = new Text({
      text: 'RECURSOS',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        fill: THEME.colors.silverDark
      })
    });
    this.headerLabel.position.set(16, 12);
    this.addChild(this.headerLabel);

    // 2. Faith Row
    this.faithSprite = Sprite.from('/assets/icons/icon_star.png');
    this.faithSprite.width = 18;
    this.faithSprite.height = 18;
    this.faithSprite.position.set(16, 34);
    this.addChild(this.faithSprite);

    this.faithValueText = new Text({
      text: '0 PF',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 15,
        fontWeight: '700',
        fill: THEME.colors.pureWhite
      })
    });
    this.faithValueText.position.set(40, 32);
    this.addChild(this.faithValueText);

    this.faithRateText = new Text({
      text: '(+0/s)',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 11,
        fontWeight: '600',
        fill: THEME.colors.silver
      })
    });
    this.faithRateText.position.set(100, 35);
    this.addChild(this.faithRateText);

    // 3. Faithful Row
    this.fielSprite = Sprite.from('/assets/icons/icon_flame.png');
    this.fielSprite.width = 18;
    this.fielSprite.height = 18;
    this.fielSprite.position.set(16, 62);
    this.addChild(this.fielSprite);

    this.fielValueText = new Text({
      text: '0 Fiéis',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 14,
        fontWeight: '700',
        fill: THEME.colors.silverLight
      })
    });
    this.fielValueText.position.set(40, 61);
    this.addChild(this.fielValueText);

    // 4. Temples Row (initially hidden, shows when templos > 0 or unlocked)
    this.temploContainer = new Container();
    this.temploContainer.position.set(16, 88);
    this.temploContainer.visible = false;
    this.addChild(this.temploContainer);

    this.temploSprite = Sprite.from('/assets/icons/icon_cathedral.png');
    this.temploSprite.width = 18;
    this.temploSprite.height = 18;
    this.temploSprite.position.set(0, 0);
    this.temploContainer.addChild(this.temploSprite);

    this.temploValueText = new Text({
      text: '0 Templos (1x)',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 13,
        fontWeight: '700',
        fill: THEME.colors.silver
      })
    });
    this.temploValueText.position.set(24, 0);
    this.temploContainer.addChild(this.temploValueText);

    this.drawBackground();
  }

  private drawBackground(): void {
    this.bgGraphics.clear();

    const actualHeight = this.temploContainer.visible ? 116 : 92;

    // Dark monochrome glass card
    this.bgGraphics.roundRect(0, 0, this.widthPx, actualHeight, 14);
    this.bgGraphics.fill({ color: THEME.colors.panelBg, alpha: 0.94 });
    this.bgGraphics.stroke({ width: 1.5, color: THEME.colors.cardBorder });

    // Inner subtle highlight line
    this.bgGraphics.roundRect(2, 2, this.widthPx - 4, 1.5, 6);
    this.bgGraphics.fill({ color: THEME.colors.pureWhite, alpha: 0.15 });
  }

  public setValues(
    faith: number,
    ratePerSec: number,
    fiesCount: number,
    templosCount: number = 0,
    multiplier: number = 1
  ): void {
    this.targetFaith = faith;
    this.faithRateText.text = `(+${Formatters.formatNumber(ratePerSec)}/s)`;
    this.faithRateText.position.x = this.faithValueText.position.x + this.faithValueText.width + 8;

    this.fielValueText.text = `${Formatters.formatNumber(fiesCount)} Fiéis`;

    // Temples display if unlocked or > 0
    if (templosCount > 0) {
      if (!this.temploContainer.visible) {
        this.temploContainer.visible = true;
        this.drawBackground();
      }
      this.temploValueText.text = `${Formatters.formatNumber(templosCount)} Templos (${multiplier.toFixed(1)}x)`;
    } else if (this.temploContainer.visible) {
      this.temploContainer.visible = false;
      this.drawBackground();
    }
  }

  public update(dt: number): void {
    // Smooth number interpolation for faith points
    if (Math.abs(this.targetFaith - this.currentDisplayFaith) > 0.01) {
      const diff = this.targetFaith - this.currentDisplayFaith;
      this.currentDisplayFaith += diff * Math.min(1, dt * 15);
      this.faithValueText.text = `${Formatters.formatNumber(this.currentDisplayFaith)} PF`;
    } else {
      this.currentDisplayFaith = this.targetFaith;
      this.faithValueText.text = `${Formatters.formatNumber(this.targetFaith)} PF`;
    }
    this.faithRateText.position.x = this.faithValueText.position.x + this.faithValueText.width + 8;
  }
}
