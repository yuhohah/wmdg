import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { UIButton } from './UIButton';

export interface ZoomControlsOptions {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  getZoomText: () => string;
}

export class ZoomControls extends Container {
  private bgGraphics: Graphics;
  private zoomInBtn: UIButton;
  private zoomOutBtn: UIButton;
  private resetBtn: UIButton;
  private zoomLabel: Text;
  private getZoomTextCallback: () => string;

  constructor(options: ZoomControlsOptions) {
    super();
    this.getZoomTextCallback = options.getZoomText;

    const width = 160;
    const height = 40;

    // Background pill
    this.bgGraphics = new Graphics();
    this.bgGraphics.roundRect(-width / 2, -height / 2, width, height, 20);
    this.bgGraphics.fill({ color: THEME.colors.panelBg, alpha: 0.9 });
    this.bgGraphics.stroke({ width: 1.5, color: THEME.colors.cardBorder });
    this.addChild(this.bgGraphics);

    // Zoom Out Button [-]
    this.zoomOutBtn = new UIButton({
      width: 32,
      height: 30,
      label: '−',
      fontSize: 16,
      radius: 15,
      bgColor: THEME.colors.cardBg,
      hoverColor: THEME.colors.cardBgHover,
      textColor: THEME.colors.pureWhite,
      onClick: options.onZoomOut
    });
    this.zoomOutBtn.position.set(-width / 2 + 22, 0);
    this.addChild(this.zoomOutBtn);

    // Current Zoom Text [ 100% ]
    this.zoomLabel = new Text({
      text: '100%',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 12,
        fontWeight: '700',
        fill: THEME.colors.silverLight,
        align: 'center'
      })
    });
    this.zoomLabel.anchor.set(0.5);
    this.zoomLabel.position.set(-6, 0);
    this.addChild(this.zoomLabel);

    // Zoom In Button [+]
    this.zoomInBtn = new UIButton({
      width: 32,
      height: 30,
      label: '+',
      fontSize: 16,
      radius: 15,
      bgColor: THEME.colors.cardBg,
      hoverColor: THEME.colors.cardBgHover,
      textColor: THEME.colors.pureWhite,
      onClick: options.onZoomIn
    });
    this.zoomInBtn.position.set(26, 0);
    this.addChild(this.zoomInBtn);

    // Reset View Button [ ↺ ]
    this.resetBtn = new UIButton({
      width: 30,
      height: 30,
      label: '↺',
      fontSize: 13,
      radius: 15,
      bgColor: THEME.colors.cardBg,
      hoverColor: THEME.colors.cardBgHover,
      textColor: THEME.colors.grayMuted,
      onClick: options.onReset
    });
    this.resetBtn.position.set(width / 2 - 20, 0);
    this.addChild(this.resetBtn);
  }

  public update(): void {
    this.zoomLabel.text = this.getZoomTextCallback();
  }
}
