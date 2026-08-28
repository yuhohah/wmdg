import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';

export class ClickerOrb extends Container {
  private baseRadius: number = 90;
  private glowGraphics: Graphics;
  private coreGraphics: Graphics;
  private ringGraphics: Graphics;
  private raysGraphics: Graphics;
  private entitySprite: Sprite;
  private entityNameText: Text;
  private hintText: Text;

  private rotationAngle: number = 0;
  private bounceScale: number = 1.0;
  private targetScale: number = 1.0;
  private isHovered: boolean = false;
  private isPressed: boolean = false;
  private onClickCallback?: (globalX: number, globalY: number) => void;

  constructor(onClick?: (globalX: number, globalY: number) => void) {
    super();
    this.onClickCallback = onClick;

    // Outer cosmic halo
    this.glowGraphics = new Graphics();
    this.addChild(this.glowGraphics);

    // Divine rays
    this.raysGraphics = new Graphics();
    this.addChild(this.raysGraphics);

    // Rotating celestial ring
    this.ringGraphics = new Graphics();
    this.addChild(this.ringGraphics);

    // Main divine entity backing
    this.coreGraphics = new Graphics();
    this.addChild(this.coreGraphics);

    // Custom Monochromatic Divine Eye Sprite Icon
    this.entitySprite = Sprite.from('/assets/icons/icon_entity_eye.png');
    this.entitySprite.anchor.set(0.5);
    this.entitySprite.width = 160;
    this.entitySprite.height = 160;
    this.addChild(this.entitySprite);

    // Entity Label
    this.entityNameText = new Text({
      text: 'A ENTIDADE DIVINA',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 3,
        fill: THEME.colors.pureWhite,
        align: 'center'
      })
    });
    this.entityNameText.anchor.set(0.5);
    this.entityNameText.position.set(0, this.baseRadius + 26);
    this.addChild(this.entityNameText);

    // Subtitle Hint
    this.hintText = new Text({
      text: 'TOQUE PARA ADORAR E GERAR FÉ',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        fill: THEME.colors.grayMuted,
        align: 'center'
      })
    });
    this.hintText.anchor.set(0.5);
    this.hintText.position.set(0, this.baseRadius + 46);
    this.addChild(this.hintText);

    this.drawEntity();
    this.setupInteractivity();
  }

  private drawEntity(): void {
    const r = this.baseRadius;

    // 1. Ethereal White & Silver Aura Glow
    this.glowGraphics.clear();
    this.glowGraphics.circle(0, 0, r * 1.45);
    this.glowGraphics.fill({ color: THEME.colors.pureWhite, alpha: 0.04 });
    this.glowGraphics.circle(0, 0, r * 1.2);
    this.glowGraphics.fill({ color: THEME.colors.silverLight, alpha: 0.08 });

    // 2. Monochromatic Geometric Rays
    this.raysGraphics.clear();
    const numRays = 8;
    for (let i = 0; i < numRays; i++) {
      const angle = (i * Math.PI * 2) / numRays;
      const x1 = Math.cos(angle) * (r + 4);
      const y1 = Math.sin(angle) * (r + 4);
      const x2 = Math.cos(angle) * (r + 18);
      const y2 = Math.sin(angle) * (r + 18);
      this.raysGraphics.moveTo(x1, y1);
      this.raysGraphics.lineTo(x2, y2);
      this.raysGraphics.stroke({ width: 1.5, color: THEME.colors.pureWhite, alpha: 0.3 });
    }

    // 3. Rotating Silver Ring
    this.ringGraphics.clear();
    for (let i = 0; i < 4; i++) {
      const startAngle = (i * Math.PI) / 2 + 0.15;
      const endAngle = startAngle + Math.PI / 3;
      this.ringGraphics.arc(0, 0, r + 10, startAngle, endAngle);
      this.ringGraphics.stroke({ width: 2, color: THEME.colors.pureWhite, alpha: 0.6 });
    }

    // 4. Sacred Core Sphere Backing
    this.coreGraphics.clear();
    this.coreGraphics.circle(0, 0, r);
    this.coreGraphics.fill({ color: 0x070707 });
    this.coreGraphics.stroke({ width: 2, color: THEME.colors.cardBorderLight, alpha: 0.7 });
  }

  private setupInteractivity(): void {
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerenter', () => {
      this.isHovered = true;
      this.targetScale = 1.05;
      this.entityNameText.style.fill = THEME.colors.pureWhite;
      this.hintText.style.fill = THEME.colors.silverLight;
    });

    this.on('pointerleave', () => {
      this.isHovered = false;
      this.isPressed = false;
      this.targetScale = 1.0;
      this.entityNameText.style.fill = THEME.colors.silver;
      this.hintText.style.fill = THEME.colors.grayMuted;
    });

    this.on('pointerdown', (e) => {
      this.isPressed = true;
      this.bounceScale = 0.88;
      const globalPos = e.global;
      if (this.onClickCallback) {
        this.onClickCallback(globalPos.x, globalPos.y);
      }
    });

    this.on('pointerup', () => {
      this.isPressed = false;
      this.bounceScale = 1.12;
    });

    this.on('pointerupoutside', () => {
      this.isPressed = false;
      this.bounceScale = 1.0;
    });
  }

  /**
   * Update animation loop called every tick
   */
  public update(dt: number): void {
    // 1. Slow rotation of outer celestial ring (faster on hover)
    const rotSpeed = this.isHovered ? 2.2 : 0.8;
    this.rotationAngle += dt * rotSpeed;
    this.ringGraphics.rotation = this.rotationAngle;
    this.raysGraphics.rotation = -this.rotationAngle * 0.5;

    // 2. Smooth spring interpolation for bounce scale
    const target = this.isPressed ? 0.9 : this.targetScale;
    this.bounceScale += (target - this.bounceScale) * Math.min(1, dt * 18);
    this.scale.set(this.bounceScale);

    // 3. Subtle floating breathing of divine eye sprite
    const breath = Math.sin(performance.now() * 0.003) * 2;
    this.entitySprite.position.y = breath;
  }
}
