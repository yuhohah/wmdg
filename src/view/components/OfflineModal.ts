import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { Formatters } from '../utils/Formatters';
import { OfflineEarningsReport } from '../../engine/types';
import { IconManager } from '../utils/IconManager';
import { UIButton } from './UIButton';

export class OfflineModal extends Container {
  private backdrop: Graphics;
  private cardGraphics: Graphics;
  private titleText: Text;
  private subtitleText: Text;
  private earningsContainer: Container;
  private claimButton: UIButton;

  private onClaimCallback?: () => void;

  constructor(onClaim?: () => void) {
    super();
    this.onClaimCallback = onClaim;

    this.visible = false;
    this.eventMode = 'static';

    // Dark backdrop overlay
    this.backdrop = new Graphics();
    this.addChild(this.backdrop);

    // Modal Card
    this.cardGraphics = new Graphics();
    this.addChild(this.cardGraphics);

    // Title
    this.titleText = new Text({
      text: 'A FÉ SE MULTIPLICOU',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 2,
        fill: THEME.colors.pureWhite,
        align: 'center'
      })
    });
    this.titleText.anchor.set(0.5);
    this.addChild(this.titleText);

    // Subtitle / Duration
    this.subtitleText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 14,
        fill: THEME.colors.silverDark,
        align: 'center'
      })
    });
    this.subtitleText.anchor.set(0.5);
    this.addChild(this.subtitleText);

    // Earnings breakdown container
    this.earningsContainer = new Container();
    this.addChild(this.earningsContainer);

    // Claim Button
    this.claimButton = new UIButton({
      width: 210,
      height: 48,
      label: 'RECEBER GRAÇA DIVINA',
      fontSize: 13,
      bgColor: THEME.colors.pureWhite,
      hoverColor: THEME.colors.silverLight,
      textColor: THEME.colors.textDark,
      onClick: () => {
        this.hide();
        if (this.onClaimCallback) {
          this.onClaimCallback();
        }
      }
    });
    this.addChild(this.claimButton);
  }

  public show(report: OfflineEarningsReport, screenW: number, screenH: number): void {
    this.visible = true;

    // Draw backdrop
    this.backdrop.clear();
    this.backdrop.rect(0, 0, screenW, screenH);
    this.backdrop.fill({ color: 0x000000, alpha: 0.85 });

    const cardW = Math.min(420, screenW - 40);
    const cardH = 260;
    const centerX = screenW / 2;
    const centerY = screenH / 2;

    // Draw card
    this.cardGraphics.clear();
    this.cardGraphics.roundRect(centerX - cardW / 2, centerY - cardH / 2, cardW, cardH, 22);
    this.cardGraphics.fill({ color: THEME.colors.panelBg });
    this.cardGraphics.stroke({ width: 2, color: THEME.colors.cardBorderLight });

    // Position Header
    this.titleText.position.set(centerX, centerY - cardH / 2 + 40);
    this.subtitleText.text = `Seus fiéis oraram por ${Formatters.formatDuration(report.elapsedSeconds)} em sua ausência`;
    this.subtitleText.position.set(centerX, centerY - cardH / 2 + 75);

    // Populate earnings
    this.earningsContainer.removeChildren();
    const faithGained = report.gains['faith'] || 0;

    const rewardBox = new Graphics();
    rewardBox.roundRect(centerX - 140, centerY - 15, 280, 50, 14);
    rewardBox.fill({ color: THEME.colors.cardBg });
    rewardBox.stroke({ width: 1, color: THEME.colors.cardBorder });
    this.earningsContainer.addChild(rewardBox);

    const starSprite = new Sprite(IconManager.getTexture('icon_star'));
    starSprite.width = 24;
    starSprite.height = 24;
    starSprite.position.set(centerX - 115, centerY - 2);
    this.earningsContainer.addChild(starSprite);

    const rewardText = new Text({
      text: `+${Formatters.formatNumber(faithGained)} Pontos de Fé`,
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 18,
        fontWeight: '700',
        fill: THEME.colors.pureWhite,
        align: 'center'
      })
    });
    rewardText.anchor.set(0, 0.5);
    rewardText.position.set(centerX - 80, centerY + 10);
    this.earningsContainer.addChild(rewardText);

    // Position Button
    this.claimButton.position.set(centerX, centerY + cardH / 2 - 42);
  }

  public hide(): void {
    this.visible = false;
  }
}
