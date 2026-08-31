import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { Formatters } from '../utils/Formatters';
import { UIButton } from './UIButton';

export interface PrestigeModalProps {
  onPrestigeConfirm: () => void;
}

export class PrestigeModal extends Container {
  private backdrop: Graphics;
  private cardGraphics: Graphics;
  private titleText: Text;
  private subtitleText: Text;
  private essenceBox: Graphics;
  private essenceSprite: Sprite;
  private essenceRewardText: Text;
  private bonusInfoText: Text;
  private confirmBtn: UIButton;
  private cancelBtn: UIButton;

  private onConfirmCallback: () => void;

  constructor(props: PrestigeModalProps) {
    super();
    this.onConfirmCallback = props.onPrestigeConfirm;

    this.visible = false;
    this.eventMode = 'static';

    // 1. Dark semi-transparent backdrop
    this.backdrop = new Graphics();
    this.addChild(this.backdrop);

    // 2. Card background
    this.cardGraphics = new Graphics();
    this.addChild(this.cardGraphics);

    // 3. Title: TRANSCENDÊNCIA DIVINA
    this.titleText = new Text({
      text: 'TRANSCENDÊNCIA DIVINA',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 2,
        fill: THEME.colors.pureWhite,
        align: 'center'
      })
    });
    this.titleText.anchor.set(0.5);
    this.addChild(this.titleText);

    // 4. Subtitle / Lore
    this.subtitleText = new Text({
      text: 'Sacrifique todo o progresso atual do culto para despertar a Essência Divina permanente da Entidade.',
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 12,
        fill: THEME.colors.silverDark,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 380
      })
    });
    this.subtitleText.anchor.set(0.5);
    this.addChild(this.subtitleText);

    // 5. Essence Gain Box
    this.essenceBox = new Graphics();
    this.addChild(this.essenceBox);

    this.essenceSprite = Sprite.from('/assets/icons/icon_entity_eye.png');
    this.essenceSprite.width = 36;
    this.essenceSprite.height = 36;
    this.addChild(this.essenceSprite);

    this.essenceRewardText = new Text({
      text: '+0 Essências Divinas',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 20,
        fontWeight: '900',
        fill: THEME.colors.pureWhite
      })
    });
    this.essenceRewardText.anchor.set(0, 0.5);
    this.addChild(this.essenceRewardText);

    // 6. Bonus Description
    this.bonusInfoText = new Text({
      text: 'Cada Essência Divina concede +10% de produção e poder de toque permanente.',
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 11,
        fontWeight: '600',
        fill: THEME.colors.silver,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 380
      })
    });
    this.bonusInfoText.anchor.set(0.5);
    this.addChild(this.bonusInfoText);

    // 7. Action Buttons
    this.confirmBtn = new UIButton({
      width: 220,
      height: 48,
      label: 'TRANSCENDER AGORA',
      fontSize: 12,
      bgColor: THEME.colors.pureWhite,
      hoverColor: THEME.colors.silverLight,
      textColor: THEME.colors.textDark,
      onClick: () => {
        this.hide();
        this.onConfirmCallback();
      }
    });
    this.addChild(this.confirmBtn);

    this.cancelBtn = new UIButton({
      width: 120,
      height: 48,
      label: 'Cancelar',
      fontSize: 12,
      bgColor: 0x1a1a1a,
      hoverColor: 0x282828,
      textColor: THEME.colors.grayMuted,
      onClick: () => this.hide()
    });
    this.addChild(this.cancelBtn);
  }

  public show(essenceGain: number, currentEssence: number, screenW: number, screenH: number): void {
    this.visible = true;

    // Draw backdrop
    this.backdrop.clear();
    this.backdrop.rect(0, 0, screenW, screenH);
    this.backdrop.fill({ color: 0x000000, alpha: 0.88 });

    const cardW = Math.min(460, screenW - 40);
    const cardH = 340;
    const centerX = screenW / 2;
    const centerY = screenH / 2;

    // Draw card
    this.cardGraphics.clear();
    this.cardGraphics.roundRect(centerX - cardW / 2, centerY - cardH / 2, cardW, cardH, 22);
    this.cardGraphics.fill({ color: THEME.colors.panelBg });
    this.cardGraphics.stroke({ width: 2, color: THEME.colors.cardBorderLight });

    // Position Header
    this.titleText.position.set(centerX, centerY - cardH / 2 + 40);
    this.subtitleText.position.set(centerX, centerY - cardH / 2 + 80);

    // Essence Gain Box
    const boxW = cardW - 60;
    const boxH = 64;
    const boxY = centerY - 25;

    this.essenceBox.clear();
    this.essenceBox.roundRect(centerX - boxW / 2, boxY, boxW, boxH, 14);
    this.essenceBox.fill({ color: THEME.colors.cardBg });
    this.essenceBox.stroke({ width: 1.5, color: THEME.colors.pureWhite, alpha: 0.3 });

    this.essenceSprite.position.set(centerX - boxW / 2 + 20, boxY + (boxH - 36) / 2);

    this.essenceRewardText.text = `+${Formatters.formatNumber(essenceGain)} Essências Divinas`;
    this.essenceRewardText.position.set(centerX - boxW / 2 + 70, boxY + boxH / 2);

    // Bonus Info
    const totalNew = currentEssence + essenceGain;
    const totalBonusPct = totalNew * 10;
    this.bonusInfoText.text = `Total após transcender: ${Formatters.formatNumber(totalNew)} Essências (+${Formatters.formatNumber(totalBonusPct)}% Poder Global Permanente)`;
    this.bonusInfoText.position.set(centerX, boxY + boxH + 28);

    // Buttons
    this.confirmBtn.position.set(centerX + 60, centerY + cardH / 2 - 40);
    this.cancelBtn.position.set(centerX - 130, centerY + cardH / 2 - 40);

    this.confirmBtn.setDisabled(essenceGain <= 0);
  }

  public hide(): void {
    this.visible = false;
  }
}
