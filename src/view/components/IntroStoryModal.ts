import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { IconManager } from '../utils/IconManager';
import { UIButton } from './UIButton';

export class IntroStoryModal extends Container {
  private backdrop: Graphics;
  private cardGraphics: Graphics;
  private iconSprite: Sprite;
  private titleText: Text;
  private subtitleText: Text;
  private p1Text: Text;
  private p2Text: Text;
  private p3Text: Text;
  private startButton: UIButton;
  private onCloseCallback?: () => void;

  constructor(onClose?: () => void) {
    super();
    this.onCloseCallback = onClose;
    this.visible = false;
    this.eventMode = 'static';

    // 1. Dark Backdrop Overlay
    this.backdrop = new Graphics();
    this.addChild(this.backdrop);

    // 2. Modal Card Container
    this.cardGraphics = new Graphics();
    this.addChild(this.cardGraphics);

    // 3. Entity Eye / Star Icon Header
    this.iconSprite = new Sprite(IconManager.getTexture('icon_star'));
    this.iconSprite.anchor.set(0.5);
    this.iconSprite.width = 36;
    this.iconSprite.height = 36;
    this.addChild(this.iconSprite);

    // 4. Main Title
    this.titleText = new Text({
      text: 'A ASCENSÃO DE UMA DIVINDADE',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 2.5,
        fill: THEME.colors.pureWhite,
        align: 'center'
      })
    });
    this.titleText.anchor.set(0.5);
    this.addChild(this.titleText);

    // 5. Subtitle
    this.subtitleText = new Text({
      text: '✦ O Despertar da Existência Absoluta ✦',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        fill: THEME.colors.silverLight,
        align: 'center'
      })
    });
    this.subtitleText.anchor.set(0.5);
    this.addChild(this.subtitleText);

    // 6. Storytelling Paragraph 1
    this.p1Text = new Text({
      text: 'Nas profundezas do vazio primordial, você despertou. Você é uma entidade divina esquecida, despida de forma, mas detentora do poder sobre o cosmos.',
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 12,
        fontWeight: '500',
        fill: THEME.colors.silver,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 400,
        lineHeight: 18
      })
    });
    this.p1Text.anchor.set(0.5, 0);
    this.addChild(this.p1Text);

    // 7. Storytelling Paragraph 2
    this.p2Text = new Text({
      text: 'Para transcender todas as eras e moldar o universo como a Existência Absoluta, você deve manifestar sua presença e despertar a fé das almas mortais.',
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 12,
        fontWeight: '600',
        fill: THEME.colors.pureWhite,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 400,
        lineHeight: 18
      })
    });
    this.p2Text.anchor.set(0.5, 0);
    this.addChild(this.p2Text);

    // 8. Storytelling Paragraph 3 (Call to Action / Guide)
    this.p3Text = new Text({
      text: 'Toque na esfera etérea para acumular Pontos de Fé, converta devotos em Fiéis e erga Templos Sagrados em sua glória.',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 11,
        fontWeight: '700',
        fill: THEME.colors.silverLight,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 400,
        lineHeight: 16
      })
    });
    this.p3Text.anchor.set(0.5, 0);
    this.addChild(this.p3Text);

    // 9. Start Button
    this.startButton = new UIButton({
      width: 260,
      height: 48,
      label: 'DESPERTAR E INICIAR ADORAÇÃO',
      fontSize: 12,
      bgColor: THEME.colors.pureWhite,
      hoverColor: THEME.colors.silverLight,
      textColor: THEME.colors.textDark,
      onClick: () => {
        this.hide();
        if (this.onCloseCallback) {
          this.onCloseCallback();
        }
      }
    });
    this.addChild(this.startButton);
  }

  public show(screenW: number, screenH: number): void {
    this.visible = true;

    // Draw backdrop
    this.backdrop.clear();
    this.backdrop.rect(0, 0, screenW, screenH);
    this.backdrop.fill({ color: 0x000000, alpha: 0.88 });

    const cardW = Math.min(460, screenW - 40);
    const cardH = 390;
    const centerX = screenW / 2;
    const centerY = screenH / 2;

    // Word wrap update according to card width
    const wrapW = cardW - 60;
    this.p1Text.style.wordWrapWidth = wrapW;
    this.p2Text.style.wordWrapWidth = wrapW;
    this.p3Text.style.wordWrapWidth = wrapW;

    // Draw card container
    this.cardGraphics.clear();
    this.cardGraphics.roundRect(centerX - cardW / 2, centerY - cardH / 2, cardW, cardH, 22);
    this.cardGraphics.fill({ color: THEME.colors.panelBg, alpha: 0.98 });
    this.cardGraphics.stroke({ width: 2, color: THEME.colors.cardBorderLight });

    // Position Header elements
    const topY = centerY - cardH / 2 + 32;
    this.iconSprite.position.set(centerX, topY);
    this.titleText.position.set(centerX, topY + 34);
    this.subtitleText.position.set(centerX, topY + 60);

    // Position Paragraphs
    this.p1Text.position.set(centerX, topY + 88);
    this.p2Text.position.set(centerX, topY + 152);
    this.p3Text.position.set(centerX, topY + 224);

    // Position Button
    this.startButton.position.set(centerX, centerY + cardH / 2 - 42);
  }

  public hide(): void {
    this.visible = false;
  }
}
