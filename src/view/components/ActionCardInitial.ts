import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { ClickerOrb } from './ClickerOrb';
import { UIButton } from './UIButton';
import { Formatters } from '../utils/Formatters';

export interface ActionCardInitialProps {
  width?: number;
  height?: number;
  onOrbClick: (globalX: number, globalY: number) => void;
  onBuyFiel: () => void;
}

export class ActionCardInitial extends Container {
  private cardWidth: number;
  private cardHeight: number;
  private bgGraphics: Graphics;
  private titleText: Text;
  private subtitleText: Text;
  private dividerGraphics: Graphics;

  public orb: ClickerOrb;
  private buyButton: UIButton;
  private buttonHelperText: Text;

  private onBuyFielCallback: () => void;

  constructor(props: ActionCardInitialProps) {
    super();

    this.cardWidth = props.width || 360;
    this.cardHeight = props.height || 480;
    this.onBuyFielCallback = props.onBuyFiel;

    // 1. Background
    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);

    // 2. Card Header
    this.titleText = new Text({
      text: 'A ENTIDADE DIVINA',
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
      text: 'Toque na esfera para adorar e gerar Fé',
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

    // 3. Clickable Orb (Esfera Clicável)
    this.orb = new ClickerOrb((x, y) => {
      props.onOrbClick(x, y);
    });
    this.orb.position.set(this.cardWidth / 2, 185);
    this.addChild(this.orb);

    // 4. Subtle Divider
    this.dividerGraphics = new Graphics();
    this.addChild(this.dividerGraphics);

    // 5. Action Button: "Adquirir fiéis"
    this.buyButton = new UIButton({
      width: this.cardWidth - 48,
      height: 52,
      label: 'Adquirir Fiéis',
      subLabel: '15 PF',
      fontSize: 13,
      bgColor: THEME.colors.btnSuccess,
      hoverColor: THEME.colors.btnSuccessHover,
      textColor: THEME.colors.textDark,
      disabled: false,
      onClick: () => this.onBuyFielCallback()
    });
    this.buyButton.position.set(this.cardWidth / 2, this.cardHeight - 66);
    this.addChild(this.buyButton);

    // 6. Helper text below button
    this.buttonHelperText = new Text({
      text: 'Cada fiel ora gerando +1 PF/s para a Entidade',
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

    // Divider line above action button
    this.dividerGraphics.clear();
    this.dividerGraphics.moveTo(24, this.cardHeight - 104);
    this.dividerGraphics.lineTo(this.cardWidth - 24, this.cardHeight - 104);
    this.dividerGraphics.stroke({ width: 1, color: THEME.colors.cardBorderLight, alpha: 0.5 });
  }

  public updateData(fielCost: number, canAfford: boolean, fiesCount: number): void {
    this.buyButton.setLabel('Adquirir Fiéis', `${Formatters.formatNumber(fielCost)} PF`);
    this.buyButton.setDisabled(!canAfford);
    this.buttonHelperText.text = `Você possui ${Formatters.formatNumber(fiesCount)} fiéis (+${Formatters.formatNumber(fiesCount)} PF/s)`;
  }

  public update(dt: number): void {
    this.orb.update(dt);
  }
}
