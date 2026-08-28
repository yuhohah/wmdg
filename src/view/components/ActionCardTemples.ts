import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { UIButton } from './UIButton';
import { Formatters } from '../utils/Formatters';

export interface ActionCardTemplesProps {
  width?: number;
  height?: number;
  onBuyTemple: () => void;
}

export class ActionCardTemples extends Container {
  private cardWidth: number;
  private cardHeight: number;
  private bgGraphics: Graphics;
  private glowGraphics: Graphics;
  private haloGraphics: Graphics;
  private templeSprite: Sprite;
  private titleText: Text;
  private subtitleText: Text;
  private descText: Text;
  private dividerGraphics: Graphics;

  // Status Box
  private statusBoxBg: Graphics;
  private multiplierText: Text;
  private templesCountText: Text;
  private impactText: Text;

  // Action Button
  private buyButton: UIButton;
  private buttonHelperText: Text;

  private rotationAngle: number = 0;
  private onBuyTempleCallback: () => void;

  constructor(props: ActionCardTemplesProps) {
    super();

    this.cardWidth = props.width || 360;
    this.cardHeight = props.height || 480;
    this.onBuyTempleCallback = props.onBuyTemple;

    // 1. Card Background
    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);

    // 2. Halo & Glow behind Temple Icon
    this.glowGraphics = new Graphics();
    this.addChild(this.glowGraphics);

    this.haloGraphics = new Graphics();
    this.addChild(this.haloGraphics);

    // 3. Header
    this.titleText = new Text({
      text: 'TEMPLOS SAGRADOS',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
        fill: THEME.colors.pureWhite,
        align: 'center'
      })
    });
    this.titleText.anchor.set(0.5, 0);
    this.titleText.position.set(this.cardWidth / 2, 16);
    this.addChild(this.titleText);

    this.subtitleText = new Text({
      text: 'Multiplica a Fé gerada pelos seus fiéis',
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 10,
        fontWeight: '600',
        fill: THEME.colors.grayMuted,
        align: 'center'
      })
    });
    this.subtitleText.anchor.set(0.5, 0);
    this.subtitleText.position.set(this.cardWidth / 2, 36);
    this.addChild(this.subtitleText);

    // 4. Temple Icon
    this.templeSprite = Sprite.from('/assets/icons/icon_cathedral.png');
    this.templeSprite.anchor.set(0.5);
    this.templeSprite.width = 110;
    this.templeSprite.height = 110;
    this.templeSprite.position.set(this.cardWidth / 2, 125);
    this.addChild(this.templeSprite);

    // 5. Description Lore
    this.descText = new Text({
      text: 'Monumentos majestosos erguidos em devoção à Entidade. Cada templo canaliza o louvor coletivo e multiplica o ganho de todos os fiéis.',
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 10,
        fill: THEME.colors.silverDark,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: this.cardWidth - 48,
        lineHeight: 14
      })
    });
    this.descText.anchor.set(0.5, 0);
    this.descText.position.set(this.cardWidth / 2, 190);
    this.addChild(this.descText);

    // 6. Status Info Panel Box
    this.statusBoxBg = new Graphics();
    this.addChild(this.statusBoxBg);

    this.multiplierText = new Text({
      text: 'Multiplicador: 1.0x',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 16,
        fontWeight: '800',
        fill: THEME.colors.pureWhite,
        align: 'center'
      })
    });
    this.multiplierText.anchor.set(0.5, 0);
    this.multiplierText.position.set(this.cardWidth / 2, 256);
    this.addChild(this.multiplierText);

    this.templesCountText = new Text({
      text: 'Templos construídos: 0 (+100% por templo)',
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 11,
        fontWeight: '600',
        fill: THEME.colors.silver,
        align: 'center'
      })
    });
    this.templesCountText.anchor.set(0.5, 0);
    this.templesCountText.position.set(this.cardWidth / 2, 282);
    this.addChild(this.templesCountText);

    this.impactText = new Text({
      text: 'Ganho dos fiéis: +0 PF/s',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 11,
        fontWeight: '600',
        fill: THEME.colors.grayMuted,
        align: 'center'
      })
    });
    this.impactText.anchor.set(0.5, 0);
    this.impactText.position.set(this.cardWidth / 2, 304);
    this.addChild(this.impactText);

    // 7. Divider
    this.dividerGraphics = new Graphics();
    this.addChild(this.dividerGraphics);

    // 8. Action Button: "Comprar Templo"
    this.buyButton = new UIButton({
      width: this.cardWidth - 48,
      height: 52,
      label: 'Construir Templo',
      subLabel: '2 500 PF',
      fontSize: 13,
      bgColor: THEME.colors.btnSuccess,
      hoverColor: THEME.colors.btnSuccessHover,
      textColor: THEME.colors.textDark,
      disabled: false,
      onClick: () => this.onBuyTempleCallback()
    });
    this.buyButton.position.set(this.cardWidth / 2, this.cardHeight - 66);
    this.addChild(this.buyButton);

    // 9. Helper text
    this.buttonHelperText = new Text({
      text: '+100% (+1x) multiplicador sobre todos os fiéis',
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 10,
        fontWeight: '500',
        fill: THEME.colors.silverDark,
        align: 'center'
      })
    });
    this.buttonHelperText.anchor.set(0.5, 0);
    this.buttonHelperText.position.set(this.cardWidth / 2, this.cardHeight - 30);
    this.addChild(this.buttonHelperText);

    this.drawBackground();
  }

  private drawBackground(): void {
    this.bgGraphics.clear();

    // Dark monochrome glass container
    this.bgGraphics.roundRect(0, 0, this.cardWidth, this.cardHeight, 18);
    this.bgGraphics.fill({ color: THEME.colors.panelBg, alpha: 0.94 });
    this.bgGraphics.stroke({ width: 1.5, color: THEME.colors.cardBorder });

    // Inner top highlight line
    this.bgGraphics.roundRect(2, 2, this.cardWidth - 4, 1.5, 8);
    this.bgGraphics.fill({ color: THEME.colors.pureWhite, alpha: 0.15 });

    // Status Box background
    this.statusBoxBg.clear();
    const boxW = this.cardWidth - 48;
    const boxH = 82;
    const boxX = 24;
    const boxY = 246;
    this.statusBoxBg.roundRect(boxX, boxY, boxW, boxH, 12);
    this.statusBoxBg.fill({ color: 0x070707, alpha: 0.8 });
    this.statusBoxBg.stroke({ width: 1, color: THEME.colors.cardBorderLight, alpha: 0.5 });

    // Divider line above action button
    this.dividerGraphics.clear();
    this.dividerGraphics.moveTo(24, this.cardHeight - 104);
    this.dividerGraphics.lineTo(this.cardWidth - 24, this.cardHeight - 104);
    this.dividerGraphics.stroke({ width: 1, color: THEME.colors.cardBorderLight, alpha: 0.5 });

    // Outer subtle glow
    this.glowGraphics.clear();
    this.glowGraphics.circle(this.cardWidth / 2, 125, 75);
    this.glowGraphics.fill({ color: THEME.colors.pureWhite, alpha: 0.04 });
  }

  public updateData(
    cost: number,
    canAfford: boolean,
    templosCount: number,
    fiesCount: number,
    multiplier: number,
    totalIncomePerSec: number
  ): void {
    this.multiplierText.text = `Multiplicador: ${multiplier.toFixed(1)}x`;
    this.templesCountText.text = `Templos construídos: ${Formatters.formatNumber(templosCount)} (+100% por templo)`;
    this.impactText.text = `${Formatters.formatNumber(fiesCount)} fiéis geram: +${Formatters.formatNumber(totalIncomePerSec)} PF/s`;

    this.buyButton.setLabel('Construir Templo', `${Formatters.formatNumber(cost)} PF`);
    this.buyButton.setDisabled(!canAfford);
  }

  public update(dt: number): void {
    // Subtle rotation of architectural halo
    this.rotationAngle += dt * 0.6;
    this.haloGraphics.clear();

    const cx = this.cardWidth / 2;
    const cy = 125;
    const r = 58;

    for (let i = 0; i < 4; i++) {
      const startAngle = this.rotationAngle + (i * Math.PI) / 2;
      const endAngle = startAngle + Math.PI / 4;
      this.haloGraphics.arc(cx, cy, r, startAngle, endAngle);
      this.haloGraphics.stroke({ width: 1.5, color: THEME.colors.pureWhite, alpha: 0.3 });
    }

    // Subtle breathing
    const breath = Math.sin(performance.now() * 0.002) * 1.5;
    this.templeSprite.position.y = 125 + breath;
  }
}
