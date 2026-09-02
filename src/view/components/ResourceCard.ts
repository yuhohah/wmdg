import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { Formatters } from '../utils/Formatters';
import { IconManager } from '../utils/IconManager';

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
  private fielRateText: Text;

  // Gold row (visible once temples unlocked or gold > 0)
  private goldContainer: Container;
  private goldSprite: Sprite;
  private goldValueText: Text;
  private goldRateText: Text;

  // Temples row (visible once templos > 0)
  private temploContainer: Container;
  private temploSprite: Sprite;
  private temploValueText: Text;

  // Sacerdotes row (visible once sacerdotes > 0)
  private sacerdoteContainer: Container;
  private sacerdoteSprite: Sprite;
  private sacerdoteValueText: Text;

  // Monuments row (visible once monuments unlocked or > 0)
  private monumentoContainer: Container;
  private monumentoSprite: Sprite;
  private monumentoValueText: Text;

  // Divine Essence row (visible once essence > 0)
  private essenceContainer: Container;
  private essenceSprite: Sprite;
  private essenceValueText: Text;

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
    this.faithSprite = new Sprite(IconManager.getTexture('icon_star'));
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
    this.fielSprite = new Sprite(IconManager.getTexture('icon_flame'));
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

    this.fielRateText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 11,
        fontWeight: '600',
        fill: THEME.colors.silver
      })
    });
    this.fielRateText.position.set(100, 61);
    this.addChild(this.fielRateText);

    // 4. Gold Row (unlocked with temples)
    this.goldContainer = new Container();
    this.goldContainer.position.set(16, 86);
    this.goldContainer.visible = false;
    this.addChild(this.goldContainer);

    this.goldSprite = new Sprite(IconManager.getTexture('icon_shrine'));
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

    this.temploSprite = new Sprite(IconManager.getTexture('/assets/icons/icon_cathedral.png'));
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

    // 6. Sacerdotes Row
    this.sacerdoteContainer = new Container();
    this.sacerdoteContainer.position.set(16, 138);
    this.sacerdoteContainer.visible = false;
    this.addChild(this.sacerdoteContainer);

    this.sacerdoteSprite = new Sprite(IconManager.getTexture('icon_shrine'));
    this.sacerdoteSprite.width = 18;
    this.sacerdoteSprite.height = 18;
    this.sacerdoteSprite.position.set(0, 0);
    this.sacerdoteContainer.addChild(this.sacerdoteSprite);

    this.sacerdoteValueText = new Text({
      text: '0 Sacerdotes',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 13,
        fontWeight: '700',
        fill: THEME.colors.silverLight
      })
    });
    this.sacerdoteValueText.position.set(24, 0);
    this.sacerdoteContainer.addChild(this.sacerdoteValueText);

    // 7. Monuments Row
    this.monumentoContainer = new Container();
    this.monumentoContainer.position.set(16, 164);
    this.monumentoContainer.visible = false;
    this.addChild(this.monumentoContainer);

    this.monumentoSprite = new Sprite(IconManager.getTexture('icon_monument'));
    this.monumentoSprite.width = 18;
    this.monumentoSprite.height = 18;
    this.monumentoSprite.position.set(0, 0);
    this.monumentoContainer.addChild(this.monumentoSprite);

    this.monumentoValueText = new Text({
      text: '0/7 Monumentos',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 13,
        fontWeight: '700',
        fill: THEME.colors.silverLight
      })
    });
    this.monumentoValueText.position.set(24, 0);
    this.monumentoContainer.addChild(this.monumentoValueText);

    // 8. Essence Row
    this.essenceContainer = new Container();
    this.essenceContainer.position.set(16, 190);
    this.essenceContainer.visible = false;
    this.addChild(this.essenceContainer);

    this.essenceSprite = new Sprite(IconManager.getTexture('/assets/icons/icon_entity_eye.png'));
    this.essenceSprite.width = 18;
    this.essenceSprite.height = 18;
    this.essenceSprite.position.set(0, 0);
    this.essenceContainer.addChild(this.essenceSprite);

    this.essenceValueText = new Text({
      text: '0 Essências (+0%)',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 13,
        fontWeight: '700',
        fill: THEME.colors.pureWhite
      })
    });
    this.essenceValueText.position.set(24, 0);
    this.essenceContainer.addChild(this.essenceValueText);

    this.drawBackground();
  }

  private drawBackground(): void {
    this.bgGraphics.clear();

    let curY = 86;

    if (this.goldContainer?.visible) {
      this.goldContainer.position.y = curY;
      curY += 26;
    }
    if (this.temploContainer?.visible) {
      this.temploContainer.position.y = curY;
      curY += 26;
    }
    if (this.sacerdoteContainer?.visible) {
      this.sacerdoteContainer.position.y = curY;
      curY += 26;
    }
    if (this.monumentoContainer?.visible) {
      this.monumentoContainer.position.y = curY;
      curY += 26;
    }
    if (this.essenceContainer?.visible) {
      this.essenceContainer.position.y = curY;
      curY += 26;
    }

    const actualHeight = curY + 6;

    // Dark monochrome glass card
    this.bgGraphics.roundRect(0, 0, this.widthPx, actualHeight, 14);
    this.bgGraphics.fill({ color: THEME.colors.panelBg, alpha: 0.94 });
    this.bgGraphics.stroke({ width: 1.5, color: THEME.colors.cardBorder });
  }

  public setValues(
    faith: number,
    faithRate: number,
    fiesCount: number,
    gold: number = 0,
    goldRate: number = 0,
    templosCount: number = 0,
    _isTempleUnlocked: boolean = false,
    sacerdotesCount: number = 0,
    monumentsCount: number = 0,
    isMonumentsUnlocked: boolean = false,
    essence: number = 0
  ): void {
    this.targetFaith = faith;
    this.targetGold = gold;

    this.faithRateText.text = `(${Formatters.formatRate(faithRate)})`;
    this.faithRateText.position.x = this.faithValueText.position.x + this.faithValueText.width + 6;

    this.fielValueText.text = `${Formatters.formatNumber(fiesCount)} Fiéis`;
    if (sacerdotesCount > 0) {
      this.fielRateText.text = `(+${Formatters.formatNumber(sacerdotesCount)}/s)`;
      this.fielRateText.position.x = this.fielValueText.position.x + this.fielValueText.width + 6;
      this.fielRateText.visible = true;
    } else {
      this.fielRateText.visible = false;
    }

    let needRedraw = false;

    // Show Gold row (visible once temple is built or gold > 0)
    const shouldShowGold = templosCount > 0 || gold > 0;
    if (shouldShowGold !== this.goldContainer.visible) {
      this.goldContainer.visible = shouldShowGold;
      needRedraw = true;
    }
    if (shouldShowGold) {
      this.goldRateText.text = `(${Formatters.formatRate(goldRate)})`;
      this.goldRateText.position.x = this.goldValueText.position.x + this.goldValueText.width + 6;
    }

    // Show Temples row
    const shouldShowTemples = templosCount > 0;
    if (shouldShowTemples !== this.temploContainer.visible) {
      this.temploContainer.visible = shouldShowTemples;
      needRedraw = true;
    }
    if (shouldShowTemples) {
      this.temploValueText.text = `${Formatters.formatNumber(templosCount)} ${templosCount === 1 ? 'Templo' : 'Templos'}`;
    }

    // Show Sacerdotes row
    const shouldShowSacerdotes = sacerdotesCount > 0;
    if (shouldShowSacerdotes !== this.sacerdoteContainer.visible) {
      this.sacerdoteContainer.visible = shouldShowSacerdotes;
      needRedraw = true;
    }
    if (shouldShowSacerdotes) {
      this.sacerdoteValueText.text = `${Formatters.formatNumber(sacerdotesCount)} Sacerdotes (+${Formatters.formatNumber(sacerdotesCount)}/s)`;
    }

    // Show Monuments row
    const shouldShowMonuments = isMonumentsUnlocked || monumentsCount > 0;
    if (shouldShowMonuments !== this.monumentoContainer.visible) {
      this.monumentoContainer.visible = shouldShowMonuments;
      needRedraw = true;
    }
    if (shouldShowMonuments) {
      this.monumentoValueText.text = `${monumentsCount}/7 Monumentos`;
    }

    // Show Essence row
    const shouldShowEssence = essence > 0;
    if (shouldShowEssence !== this.essenceContainer.visible) {
      this.essenceContainer.visible = shouldShowEssence;
      needRedraw = true;
    }
    if (shouldShowEssence) {
      this.essenceValueText.text = `${Formatters.formatNumber(essence)} Essências (+${Formatters.formatNumber(essence * 10)}% Global)`;
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

  public reset(): void {
    this.targetFaith = 0;
    this.currentDisplayFaith = 0;
    this.targetGold = 0;
    this.currentDisplayGold = 0;
    this.goldContainer.visible = false;
    this.temploContainer.visible = false;
    this.sacerdoteContainer.visible = false;
    this.monumentoContainer.visible = false;
    this.essenceContainer.visible = false;
    this.faithValueText.text = '0 PF';
    this.faithRateText.text = '(+0/s)';
    this.fielValueText.text = '0 Fiéis';
    this.goldValueText.text = '0 Ouro';
    this.goldRateText.text = '(+0/s)';
    this.temploValueText.text = '0 Templos';
    this.sacerdoteValueText.text = '0 Sacerdotes';
    this.monumentoValueText.text = '0/7 Monumentos';
    this.essenceValueText.text = '0 Essências (+0%)';
    this.drawBackground();
  }
}
