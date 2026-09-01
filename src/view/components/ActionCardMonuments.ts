import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { UIButton } from './UIButton';
import { Formatters } from '../utils/Formatters';
import { MonumentConfig, MONUMENTS } from '../../engine/UpgradeManager';
import { IconManager } from '../utils/IconManager';

export interface ActionCardMonumentsProps {
  width?: number;
  height?: number;
  onBuyMonument: () => void;
}

export class ActionCardMonuments extends Container {
  private cardWidth: number;
  private cardHeight: number;
  private bgGraphics: Graphics;
  private glowGraphics: Graphics;
  private haloGraphics: Graphics;
  private monumentSprite: Sprite;

  // Header
  private titleText: Text;
  private progressText: Text;
  private dividerGraphics: Graphics;

  // Monument Details
  private currentNameText: Text;
  private currentSubtitleText: Text;
  private bonusBadgeContainer: Container;
  private bonusBadgeBg: Graphics;
  private bonusBadgeText: Text;

  // Action Button
  private awakenBtn: UIButton;

  // Visual Nodes indicator (7 dots)
  private nodesGraphics: Graphics;

  private rotationAngle: number = 0;
  private onBuyMonumentCallback: () => void;

  constructor(props: ActionCardMonumentsProps) {
    super();

    this.cardWidth = props.width || 360;
    this.cardHeight = props.height || 520;
    this.onBuyMonumentCallback = props.onBuyMonument;

    // 1. Card Background
    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);

    // 2. Halo & Glow behind Monument Icon
    this.glowGraphics = new Graphics();
    this.addChild(this.glowGraphics);

    this.haloGraphics = new Graphics();
    this.addChild(this.haloGraphics);

    // 3. Header: MONUMENTOS ANCESTRAIS & Progresso
    this.titleText = new Text({
      text: 'MONUMENTOS ANCESTRAIS',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 2,
        fill: THEME.colors.pureWhite,
        align: 'center'
      })
    });
    this.titleText.anchor.set(0.5, 0);
    this.titleText.position.set(this.cardWidth / 2, 16);
    this.addChild(this.titleText);

    this.progressText = new Text({
      text: '0 de 7 Despertados',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 12,
        fontWeight: '700',
        fill: THEME.colors.silverLight,
        align: 'center'
      })
    });
    this.progressText.anchor.set(0.5, 0);
    this.progressText.position.set(this.cardWidth / 2, 36);
    this.addChild(this.progressText);

    // 4. Central Monument Icon
    this.monumentSprite = new Sprite(IconManager.getTexture('icon_monument'));
    this.monumentSprite.anchor.set(0.5);
    this.monumentSprite.width = 130;
    this.monumentSprite.height = 130;
    this.monumentSprite.position.set(this.cardWidth / 2, 150);
    this.addChild(this.monumentSprite);

    // 5. Monument Info: Name & Lore
    this.currentNameText = new Text({
      text: '1. Monólito da Aurora',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 1,
        fill: THEME.colors.pureWhite,
        align: 'center'
      })
    });
    this.currentNameText.anchor.set(0.5, 0);
    this.currentNameText.position.set(this.cardWidth / 2, 235);
    this.addChild(this.currentNameText);

    this.currentSubtitleText = new Text({
      text: 'Canaliza a primeira centelha de luz cósmica',
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 11,
        fontWeight: '500',
        fill: THEME.colors.silverDark,
        align: 'center'
      })
    });
    this.currentSubtitleText.anchor.set(0.5, 0);
    this.currentSubtitleText.position.set(this.cardWidth / 2, 260);
    this.addChild(this.currentSubtitleText);

    // 6. Bonus Badge
    this.bonusBadgeContainer = new Container();
    this.bonusBadgeContainer.position.set(this.cardWidth / 2, 290);
    this.addChild(this.bonusBadgeContainer);

    this.bonusBadgeBg = new Graphics();
    this.bonusBadgeContainer.addChild(this.bonusBadgeBg);

    this.bonusBadgeText = new Text({
      text: 'Bênção: +100% Produção Global',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        fill: THEME.colors.pureWhite,
        align: 'center'
      })
    });
    this.bonusBadgeText.anchor.set(0.5, 0.5);
    this.bonusBadgeContainer.addChild(this.bonusBadgeText);

    // 7. Divider
    this.dividerGraphics = new Graphics();
    this.addChild(this.dividerGraphics);

    // 8. Awaken Monument Button
    this.awakenBtn = new UIButton({
      width: this.cardWidth - 40,
      height: 58,
      label: 'DESPERTAR MONUMENTO (1/7)',
      subLabel: '100.000 Ouro',
      fontSize: 13,
      bgColor: THEME.colors.btnSuccess,
      hoverColor: THEME.colors.btnSuccessHover,
      textColor: THEME.colors.textDark,
      disabled: false,
      onClick: () => this.onBuyMonumentCallback()
    });
    this.awakenBtn.position.set(this.cardWidth / 2, 385);
    this.addChild(this.awakenBtn);

    // 9. 7 Visual Progress Nodes
    this.nodesGraphics = new Graphics();
    this.addChild(this.nodesGraphics);

    this.drawBackground();
  }

  private drawBackground(): void {
    this.bgGraphics.clear();

    // Dark monochrome glass container
    this.bgGraphics.roundRect(0, 0, this.cardWidth, this.cardHeight, 18);
    this.bgGraphics.fill({ color: THEME.colors.panelBg, alpha: 0.94 });
    this.bgGraphics.stroke({ width: 1.5, color: THEME.colors.cardBorder });

    // Divider line
    this.dividerGraphics.clear();
    this.dividerGraphics.moveTo(20, 335);
    this.dividerGraphics.lineTo(this.cardWidth - 20, 335);
    this.dividerGraphics.stroke({ width: 1, color: THEME.colors.cardBorderLight, alpha: 0.5 });

    // Glow circle behind icon
    this.glowGraphics.clear();
    this.glowGraphics.circle(this.cardWidth / 2, 150, 75);
    this.glowGraphics.fill({ color: THEME.colors.pureWhite, alpha: 0.04 });
  }

  private updateBonusBadge(text: string): void {
    this.bonusBadgeText.text = text;
    const w = this.bonusBadgeText.width + 24;
    const h = 26;

    this.bonusBadgeBg.clear();
    this.bonusBadgeBg.roundRect(-w / 2, -h / 2, w, h, 6);
    this.bonusBadgeBg.fill({ color: 0x141414, alpha: 0.9 });
    this.bonusBadgeBg.stroke({ width: 1, color: 0x333333 });
  }

  public updateData(
    _goldAmount: number,
    monumentsCount: number,
    nextCost: number,
    canAfford: boolean,
    nextInfo?: MonumentConfig
  ): void {
    this.progressText.text = `${monumentsCount} de 7 Despertados`;

    if (monumentsCount >= 7) {
      this.currentNameText.text = '7. Trono Divino';
      this.currentSubtitleText.text = 'Todos os 7 Monumentos Ancestrais foram erguidos!';
      this.updateBonusBadge('✦ PODER UNIVERSAL SUPREMO ATIVO ✦');

      this.awakenBtn.setLabel('✦ MONUMENTOS COMPLETOS ✦', '7/7 Concluídos');
      this.awakenBtn.setDisabled(true);
    } else if (nextInfo) {
      this.currentNameText.text = `${nextInfo.id}. ${nextInfo.name}`;
      this.currentSubtitleText.text = nextInfo.subtitle;
      this.updateBonusBadge(`Bênção: ${nextInfo.bonusText}`);

      this.awakenBtn.setLabel(
        `DESPERTAR MONUMENTO (${nextInfo.id}/7)`,
        `${Formatters.formatNumber(nextCost)} Ouro`
      );
      this.awakenBtn.setDisabled(!canAfford);
    }

    // Draw the 7 progress dots
    this.nodesGraphics.clear();
    const totalNodes = 7;
    const dotSpacing = 32;
    const startX = this.cardWidth / 2 - ((totalNodes - 1) * dotSpacing) / 2;
    const nodeY = 445;

    for (let i = 0; i < totalNodes; i++) {
      const x = startX + i * dotSpacing;
      const isBuilt = i < monumentsCount;
      const isNext = i === monumentsCount;

      this.nodesGraphics.circle(x, nodeY, isBuilt ? 7 : (isNext ? 6 : 4));
      if (isBuilt) {
        this.nodesGraphics.fill({ color: THEME.colors.pureWhite, alpha: 1.0 });
      } else if (isNext) {
        this.nodesGraphics.fill({ color: THEME.colors.silverLight, alpha: 0.6 });
        this.nodesGraphics.stroke({ width: 1.5, color: THEME.colors.pureWhite });
      } else {
        this.nodesGraphics.fill({ color: 0x222222, alpha: 0.8 });
        this.nodesGraphics.stroke({ width: 1, color: 0x3a3a3a });
      }
    }
  }

  public update(dt: number): void {
    // Subtle rotation of architectural halo
    this.rotationAngle += dt * 0.5;
    this.haloGraphics.clear();

    const cx = this.cardWidth / 2;
    const cy = 150;
    const r = 70;

    for (let i = 0; i < 6; i++) {
      const startAngle = this.rotationAngle + (i * Math.PI) / 3;
      const endAngle = startAngle + Math.PI / 6;
      this.haloGraphics.arc(cx, cy, r, startAngle, endAngle);
      this.haloGraphics.stroke({ width: 1.5, color: THEME.colors.pureWhite, alpha: 0.35 });
    }

    // Gentle breathing animation
    const breath = Math.sin(performance.now() * 0.0018) * 2;
    this.monumentSprite.position.y = 150 + breath;
  }

  public reset(): void {
    this.progressText.text = '0 de 7 Despertados';
    const first = MONUMENTS[0];
    if (first) {
      this.currentNameText.text = `1. ${first.name}`;
      this.currentSubtitleText.text = first.subtitle;
      this.updateBonusBadge(`Bênção: ${first.bonusText}`);
      this.awakenBtn.setLabel('DESPERTAR MONUMENTO (1/7)', `${Formatters.formatNumber(first.cost)} Ouro`);
      this.awakenBtn.setDisabled(true);
    }
  }
}
