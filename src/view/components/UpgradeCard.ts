import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { Formatters } from '../utils/Formatters';
import { UpgradeConfig, UpgradeState } from '../../engine/types';
import { UIButton } from './UIButton';

export interface UpgradeCardProps {
  config: UpgradeConfig;
  state: UpgradeState;
  cost: number;
  outputPerSec: number;
  canAfford: boolean;
  onBuy: (id: string) => void;
  width?: number;
  height?: number;
}

export class UpgradeCard extends Container {
  private config: UpgradeConfig;
  private cardWidth: number;
  private cardHeight: number;

  private bgGraphics: Graphics;
  private iconSprite: Sprite;
  private titleText: Text;
  private descText: Text;
  private countBadgeBg: Graphics;
  private countBadgeText: Text;
  private statsText: Text;
  private buyButton: UIButton;

  private onBuyCallback: (id: string) => void;

  constructor(props: UpgradeCardProps) {
    super();

    this.config = props.config;
    this.cardWidth = props.width || 340;
    this.cardHeight = props.height || 76;
    this.onBuyCallback = props.onBuy;

    // Background Card
    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);

    // Upgrade Custom Image Sprite Icon
    this.iconSprite = Sprite.from(props.config.icon);
    this.iconSprite.width = 36;
    this.iconSprite.height = 36;
    this.iconSprite.position.set(14, (this.cardHeight - 36) / 2);
    this.addChild(this.iconSprite);

    // Title Text
    this.titleText = new Text({
      text: props.config.name,
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 14,
        fontWeight: '800',
        fill: THEME.colors.pureWhite
      })
    });
    this.titleText.position.set(56, 10);
    this.addChild(this.titleText);

    // Quantity Badge (Qtd: X)
    this.countBadgeBg = new Graphics();
    this.addChild(this.countBadgeBg);

    this.countBadgeText = new Text({
      text: `Qtd: ${props.state.count}`,
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 11,
        fontWeight: '700',
        fill: THEME.colors.silverLight
      })
    });
    this.countBadgeText.anchor.set(0.5);
    this.addChild(this.countBadgeText);

    // Stats / Output Text
    this.statsText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 11,
        fontWeight: '600',
        fill: THEME.colors.silver
      })
    });
    this.statsText.position.set(56, 32);
    this.addChild(this.statsText);

    // Description text
    this.descText = new Text({
      text: props.config.description,
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 10,
        fill: THEME.colors.grayMuted
      })
    });
    this.descText.position.set(56, 51);
    this.addChild(this.descText);

    // Buy Button (Crisp White on Dark)
    this.buyButton = new UIButton({
      width: 96,
      height: 44,
      label: `${Formatters.formatNumber(props.cost)} PF`,
      subLabel: '+Adquirir',
      fontSize: 12,
      bgColor: THEME.colors.btnSuccess,
      hoverColor: THEME.colors.btnSuccessHover,
      textColor: THEME.colors.textDark,
      disabled: !props.canAfford,
      onClick: () => this.onBuyCallback(this.config.id)
    });
    this.buyButton.position.set(this.cardWidth - 58, this.cardHeight / 2);
    this.addChild(this.buyButton);

    this.drawCard();
    this.updateData(props.state, props.cost, props.outputPerSec, props.canAfford);
  }

  private drawCard(): void {
    this.bgGraphics.clear();
    this.bgGraphics.roundRect(0, 0, this.cardWidth, this.cardHeight, 14);
    this.bgGraphics.fill({ color: THEME.colors.cardBg });
    this.bgGraphics.stroke({ width: 1, color: THEME.colors.cardBorder });
  }

  public updateData(state: UpgradeState, cost: number, outputPerSec: number, canAfford: boolean): void {
    // 1. Quantity badge (Qtd: X)
    this.countBadgeText.text = `Qtd: ${state.count}`;
    const badgeW = Math.max(52, this.countBadgeText.width + 14);
    const badgeH = 18;
    const badgeX = this.titleText.position.x + this.titleText.width + badgeW / 2 + 8;
    const badgeY = this.titleText.position.y + 8;

    this.countBadgeBg.clear();
    this.countBadgeBg.roundRect(badgeX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 8);
    this.countBadgeBg.fill({ color: THEME.colors.cardBorder });
    this.countBadgeBg.stroke({ width: 1, color: THEME.colors.cardBorderLight });
    this.countBadgeText.position.set(badgeX, badgeY);

    // 2. Stats output text
    if (this.config.clickMultiplier) {
      this.statsText.text = `+${Formatters.formatNumber(this.config.clickMultiplier * state.count)} PF/toque`;
      this.statsText.style.fill = THEME.colors.pureWhite;
    } else {
      this.statsText.text = `+${Formatters.formatNumber(outputPerSec)} PF/s`;
      this.statsText.style.fill = THEME.colors.silver;
    }

    // 3. Button updates
    this.buyButton.setLabel(`${Formatters.formatNumber(cost)} PF`, '+Adquirir');
    this.buyButton.setDisabled(!canAfford);
  }
}
