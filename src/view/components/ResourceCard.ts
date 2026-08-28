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

  // Gold row (visible once temples unlocked or gold > 0)
  private goldContainer: Container;
  private goldSprite: Sprite;
  private goldValueText: Text;
  private goldRateText: Text;

  // Temples row (visible once templos > 0)
  private temploContainer: Container;
  private temploSprite: Sprite;
  private temploValueText: Text;

  private currentDisplayFaith: number = 0;
  private targetFaith: number = 0;
  private currentDisplayGold: number = 0;
  private targetGold: number = 0;
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
        fontSize: 14,
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
    this.faithRateText.position.set(95, 34);
    this.addChild(this.faithRateText);

    // 3. Faithful Row
    this.fielSprite = Sprite.from('/assets/icons/icon_flame.png');
    this.fielSprite.width = 18;
    this.fielSprite.height = 18;
    this.fielSprite.position.set(16, 60);
    this.addChild(this.fielSprite);

    this.fielValueText = new Text({
      text: '0 Fiéis',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 13,
        fontWeight: '700',
        fill: THEME.colors.silverLight
      })
    });
    this.fielValueText.position.set(40, 59);
    this.addChild(this.fielValueText);

    // 4. Gold Row (unlocked with temples)
    this.goldContainer = new Container();
    this.goldContainer.position.set(16, 86);
    this.goldContainer.visible = false;
    this.addChild(this.goldContainer);

    this.goldSprite = Sprite.from('/assets/icons/icon_shrine.png');
    this.goldSprite.width = 18;
    this.goldSprite.height = 18;
    this.goldSprite.position.set(0, 0);
    this.goldContainer.addChild(this.goldSprite);

    this.goldValueText = new Text({
      text: '0 Ouro',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 13,
        fontWeight: '700',
        fill: THEME.colors.pureWhite
      })
    });
    this.goldValueText.position.set(24, -1);
    this.goldContainer.addChild(this.goldValueText);

    this.goldRateText = new Text({
      text: '(+0/s)',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 11,
        fontWeight: '600',
        fill: THEME.colors.silver
      })
    });
    this.goldRateText.position.set(80, 1);
    this.goldContainer.addChild(this.goldRateText);

    // 5. Temples Row
    this.temploContainer = new Container();
    this.temploContainer.position.set(16, 112);
    this.temploContainer.visible = false;
    this.addChild(this.temploContainer);

    this.temploSprite = Sprite.from('/assets/icons/icon_cathedral.png');
    this.temploSprite.width = 18;
    this.temploSprite.height = 18;
    this.temploSprite.position.set(0, 0);
    this.temploContainer.addChild(this.temploSprite);

    this.temploValueText = new Text({
      text: '0 Templos',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 13,
        fontWeight: '700',
        fill: THEME.colors.silverLight
      })
    });
    this.temploValueText.position.set(24, 0);
    this.temploContainer.addChild(this.temploValueText);

    this.drawBackground();
  }

  private drawBackground(): void {
    this.bgGraphics.clear();

    let actualHeight = 88;
    if (this.goldContainer.visible && this.temploContainer.visible) {
      actualHeight = 138;
    } else if (this.goldContainer.visible || this.temploContainer.visible) {
      actualHeight = 114;
    }

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
    faithRate: number,
    fiesCount: number,
    gold: number = 0,
    goldRate: number = 0,
    templosCount: number = 0,
    isTempleUnlocked: boolean = false
  ): void {
    this.targetFaith = faith;
    this.targetGold = gold;

    this.faithRateText.text = `(+${Formatters.formatNumber(faithRate)}/s)`;
    this.faithRateText.position.x = this.faithValueText.position.x + this.faithValueText.width + 6;

    this.fielValueText.text = `${Formatters.formatNumber(fiesCount)} Fiéis`;

    // Show Gold row if unlocked or gold > 0
    let needRedraw = false;
    const shouldShowGold = isTempleUnlocked || templosCount > 0 || gold > 0;
    if (shouldShowGold !== this.goldContainer.visible) {
      this.goldContainer.visible = shouldShowGold;
      needRedraw = true;
    }

    if (shouldShowGold) {
      this.goldRateText.text = `(+${Formatters.formatNumber(goldRate)}/s)`;
      this.goldRateText.position.x = this.goldValueText.position.x + this.goldValueText.width + 6;
    }

    // Show Temples row if templos > 0
    const shouldShowTemples = templosCount > 0;
    if (shouldShowTemples !== this.temploContainer.visible) {
      this.temploContainer.visible = shouldShowTemples;
      needRedraw = true;
    }

    if (shouldShowTemples) {
      this.temploValueText.text = `${Formatters.formatNumber(templosCount)} ${templosCount === 1 ? 'Templo' : 'Templos'}`;
    }

    if (needRedraw) {
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
    this.faithRateText.position.x = this.faithValueText.position.x + this.faithValueText.width + 6;

    // Smooth number interpolation for gold
    if (this.goldContainer.visible) {
      if (Math.abs(this.targetGold - this.currentDisplayGold) > 0.01) {
        const diff = this.targetGold - this.currentDisplayGold;
        this.currentDisplayGold += diff * Math.min(1, dt * 15);
        this.goldValueText.text = `${Formatters.formatNumber(this.currentDisplayGold)} Ouro`;
      } else {
        this.currentDisplayGold = this.targetGold;
        this.goldValueText.text = `${Formatters.formatNumber(this.targetGold)} Ouro`;
      }
      this.goldRateText.position.x = this.goldValueText.position.x + this.goldValueText.width + 6;
    }
  }
}
