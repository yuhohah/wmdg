import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';

export interface ButtonOptions {
  width: number;
  height: number;
  label: string;
  subLabel?: string;
  bgColor?: number;
  hoverColor?: number;
  textColor?: number;
  fontSize?: number;
  radius?: number;
  disabled?: boolean;
  onClick?: () => void;
}

export class UIButton extends Container {
  private bgGraphics: Graphics;
  private labelText: Text;
  private subText: Text | null = null;
  public currentOptions: ButtonOptions;
  private isHovered: boolean = false;
  private isPressed: boolean = false;
  private disabled: boolean = false;

  constructor(options: ButtonOptions) {
    super();

    this.currentOptions = {
      radius: 14,
      bgColor: THEME.colors.btnPrimary,
      hoverColor: THEME.colors.btnPrimaryHover,
      textColor: THEME.colors.textDark,
      fontSize: 14,
      disabled: false,
      ...options
    };

    this.disabled = !!this.currentOptions.disabled;

    // Background shape
    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);

    // Label Text
    this.labelText = new Text({
      text: this.currentOptions.label,
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: this.currentOptions.fontSize,
        fontWeight: '700',
        fill: this.currentOptions.textColor,
        align: 'center'
      })
    });
    this.labelText.anchor.set(0.5);
    this.addChild(this.labelText);

    // Optional Sublabel
    if (this.currentOptions.subLabel) {
      this.subText = new Text({
        text: this.currentOptions.subLabel,
        style: new TextStyle({
          fontFamily: THEME.fonts.heading,
          fontSize: 10,
          fontWeight: '700',
          fill: this.currentOptions.textColor === THEME.colors.textDark ? 0x444444 : THEME.colors.textMuted,
          align: 'center'
        })
      });
      this.subText.anchor.set(0.5);
      this.addChild(this.subText);
    }

    this.updateLayout();
    this.drawBackground();
    this.setupInteractivity();
  }

  private drawBackground(): void {
    this.bgGraphics.clear();

    const { width, height, radius } = this.currentOptions;
    let fillColor = this.currentOptions.bgColor!;
    let strokeColor = THEME.colors.pureWhite;
    let strokeAlpha = 0.3;

    if (this.disabled) {
      fillColor = THEME.colors.btnDisabled;
      strokeColor = THEME.colors.btnDisabledBorder;
      strokeAlpha = 0.8;
    } else if (this.isPressed) {
      fillColor = this.currentOptions.hoverColor || this.currentOptions.bgColor!;
      strokeAlpha = 0.6;
    } else if (this.isHovered) {
      fillColor = this.currentOptions.hoverColor || this.currentOptions.bgColor!;
      strokeAlpha = 0.8;
    }

    this.bgGraphics.roundRect(-width / 2, -height / 2, width, height, radius || 14);
    this.bgGraphics.fill({ color: fillColor });
    this.bgGraphics.stroke({ width: 1.5, color: strokeColor, alpha: strokeAlpha });
  }

  private updateLayout(): void {
    if (this.subText) {
      this.labelText.position.set(0, -7);
      this.subText.position.set(0, 9);
      this.subText.style.fill = this.disabled ? this.currentOptions.textColor === THEME.colors.textDark ? 0x333333 : 0x555555 : (this.currentOptions.textColor === THEME.colors.textDark ? 0x444444 : THEME.colors.textMuted);
    } else {
      this.labelText.position.set(0, 0);
    }

    this.labelText.style.fill = this.disabled ? THEME.colors.btnDisabledText : (this.currentOptions.textColor ?? THEME.colors.textPrimary);
  }

  private setupInteractivity(): void {
    this.eventMode = 'static';
    this.cursor = this.disabled ? 'not-allowed' : 'pointer';

    this.on('pointerenter', () => {
      if (this.disabled) return;
      this.isHovered = true;
      this.scale.set(1.02);
      this.drawBackground();
    });

    this.on('pointerleave', () => {
      this.isHovered = false;
      this.isPressed = false;
      this.scale.set(1.0);
      this.drawBackground();
    });

    this.on('pointerdown', (e) => {
      if (this.disabled) return;
      e.stopPropagation?.();
      this.isPressed = true;
      this.scale.set(0.96);
      this.drawBackground();
    });

    this.on('pointerup', () => {
      if (this.disabled) return;
      const wasPressed = this.isPressed;
      this.isPressed = false;
      this.scale.set(this.isHovered ? 1.02 : 1.0);
      this.drawBackground();

      if (wasPressed && this.currentOptions.onClick) {
        this.currentOptions.onClick();
      }
    });

    this.on('pointerupoutside', () => {
      this.isPressed = false;
      this.isHovered = false;
      this.scale.set(1.0);
      this.drawBackground();
    });
  }

  public setDisabled(disabled: boolean): void {
    if (this.disabled === disabled) return;
    this.disabled = disabled;
    this.cursor = disabled ? 'not-allowed' : 'pointer';
    this.updateLayout();
    this.drawBackground();
  }

  public setLabel(label: string, subLabel?: string): void {
    this.labelText.text = label;
    if (subLabel !== undefined) {
      if (!this.subText) {
        this.subText = new Text({
          text: subLabel,
          style: new TextStyle({
            fontFamily: THEME.fonts.heading,
            fontSize: 10,
            fontWeight: '700',
            fill: this.currentOptions.textColor === THEME.colors.textDark ? 0x444444 : THEME.colors.textMuted,
            align: 'center'
          })
        });
        this.subText.anchor.set(0.5);
        this.addChild(this.subText);
      } else {
        this.subText.text = subLabel;
      }
    }
    this.updateLayout();
  }
}
