import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { ClickerOrb } from './ClickerOrb';
import { UIButton } from './UIButton';
import { Formatters } from '../utils/Formatters';

export interface ActionCardInitialProps {
  width?: number;
  height?: number;
  onOrbClick: (globalX: number, globalY: number) => void;
  onConvertFiel: () => void;
  onConvertMaxFiel: () => void;
}

export class ActionCardInitial extends Container {
  private cardWidth: number;
  private cardHeight: number;
  private bgGraphics: Graphics;
  private titleText: Text;
  private rateText: Text;
  private dividerGraphics: Graphics;

  public orb: ClickerOrb;
  private convertButton: UIButton;
  private convertMaxButton: UIButton;
  private buttonHelperText: Text;

  private currentDisplayFaith: number = 0;
  private targetFaith: number = 0;
  private onConvertFielCallback: () => void;
  private onConvertMaxFielCallback: () => void;

  constructor(props: ActionCardInitialProps) {
    super();

    this.cardWidth = props.width || 360;
    this.cardHeight = props.height || 520;
    this.onConvertFielCallback = props.onConvertFiel;
    this.onConvertMaxFielCallback = props.onConvertMaxFiel;

    // 1. Background
    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);

    // 2. Header: "VOCÊ TEM X PONTOS DE FÉ" e abaixo "+Y/s"
    this.titleText = new Text({
      text: 'VOCÊ TEM 0 PONTOS DE FÉ',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1.5,
        fill: THEME.colors.pureWhite,
        align: 'center'
      })
    });
    this.titleText.anchor.set(0.5, 0);
    this.titleText.position.set(this.cardWidth / 2, 16);
    this.addChild(this.titleText);

    this.rateText = new Text({
      text: '+0/s',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 13,
        fontWeight: '700',
        fill: THEME.colors.silverLight,
        align: 'center'
      })
    });
    this.rateText.anchor.set(0.5, 0);
    this.rateText.position.set(this.cardWidth / 2, 36);
    this.addChild(this.rateText);

    // 3. Clickable Orb (Esfera Clicável)
    this.orb = new ClickerOrb((x, y) => {
      props.onOrbClick(x, y);
    });
    this.orb.position.set(this.cardWidth / 2, 195);
    this.addChild(this.orb);

    // 4. Subtle Divider
    this.dividerGraphics = new Graphics();
    this.addChild(this.dividerGraphics);

    // 5. Dual Action Buttons: "Converter Fiel" e "Converter Max"
    const margin = 20;
    const gap = 10;
    const btnWidth = Math.floor((this.cardWidth - margin * 2 - gap) / 2);
    const btnHeight = 52;
    const btnY = this.cardHeight - 66;

    // Left Button: Converter Fiel
    this.convertButton = new UIButton({
      width: btnWidth,
      height: btnHeight,
      label: 'Converter Fiel',
      subLabel: '15 PF',
      fontSize: 11,
      bgColor: THEME.colors.btnSuccess,
      hoverColor: THEME.colors.btnSuccessHover,
      textColor: THEME.colors.textDark,
      disabled: false,
      onClick: () => this.onConvertFielCallback()
    });
    this.convertButton.position.set(margin + btnWidth / 2, btnY);
    this.addChild(this.convertButton);

    // Right Button: Converter Max
    this.convertMaxButton = new UIButton({
      width: btnWidth,
      height: btnHeight,
      label: 'Converter Max',
      subLabel: '+0 (0 PF)',
      fontSize: 11,
      bgColor: THEME.colors.cardBgHover,
      hoverColor: 0x2a2a2a,
      textColor: THEME.colors.pureWhite,
      disabled: true,
      onClick: () => this.onConvertMaxFielCallback()
    });
    this.convertMaxButton.position.set(margin + btnWidth + gap + btnWidth / 2, btnY);
    this.addChild(this.convertMaxButton);

    // 6. Helper text below buttons
    this.buttonHelperText = new Text({
      text: 'Você possui 0 fiéis (+0 PF/s)',
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

    // Divider line above action buttons
    this.dividerGraphics.clear();
    this.dividerGraphics.moveTo(20, this.cardHeight - 104);
    this.dividerGraphics.lineTo(this.cardWidth - 20, this.cardHeight - 104);
    this.dividerGraphics.stroke({ width: 1, color: THEME.colors.cardBorderLight, alpha: 0.5 });
  }

  public updateData(
    faith: number,
    faithRate: number,
    fielCost: number,
    canAffordFiel: boolean,
    fiesCount: number,
    maxCount: number,
    maxCost: number
  ): void {
    this.targetFaith = faith;
    this.rateText.text = `+${Formatters.formatNumber(faithRate)}/s`;

    this.convertButton.setLabel('Converter Fiel', `${Formatters.formatNumber(fielCost)} PF`);
    this.convertButton.setDisabled(!canAffordFiel);

    const maxSubLabel = maxCount > 0
      ? `+${Formatters.formatNumber(maxCount)} (${Formatters.formatNumber(maxCost)} PF)`
      : '0 PF';
    this.convertMaxButton.setLabel('Converter Max', maxSubLabel);
    this.convertMaxButton.setDisabled(maxCount <= 0);

    this.buttonHelperText.text = `Você possui ${Formatters.formatNumber(fiesCount)} fiéis (+${Formatters.formatNumber(faithRate)} PF/s)`;
  }

  public update(dt: number): void {
    this.orb.update(dt);

    // Smooth interpolation for faith counter in header
    if (Math.abs(this.targetFaith - this.currentDisplayFaith) > 0.01) {
      const diff = this.targetFaith - this.currentDisplayFaith;
      this.currentDisplayFaith += diff * Math.min(1, dt * 15);
      this.titleText.text = `VOCÊ TEM ${Formatters.formatNumber(this.currentDisplayFaith)} PONTOS DE FÉ`;
    } else {
      this.currentDisplayFaith = this.targetFaith;
      this.titleText.text = `VOCÊ TEM ${Formatters.formatNumber(this.targetFaith)} PONTOS DE FÉ`;
    }
  }

  public reset(): void {
    this.targetFaith = 0;
    this.currentDisplayFaith = 0;
    this.titleText.text = 'VOCÊ TEM 0 PONTOS DE FÉ';
    this.rateText.text = '+0/s';
    this.buttonHelperText.text = 'Você possui 0 fiéis (+0 PF/s)';
  }
}
