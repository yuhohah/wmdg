import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { THEME } from '../theme';
import { IconManager } from '../utils/IconManager';

export class ClickerOrb extends Container {
  private baseRadius: number = 90;
  private glowGraphics: Graphics;
  private coreGraphics: Graphics;
  private ringGraphics: Graphics;
  private raysGraphics: Graphics;
  private entitySprite: Sprite;

  // Multi-frame Entity Orb Textures
  private entityTextures: Texture[] = [];
  private currentFrameIndex: number = 0;
  private animTimer: number = 0;
  private clickFlashTimer: number = 0;

  private rotationAngle: number = 0;
  private bounceScale: number = 1.0;
  private targetScale: number = 1.0;
  private isHovered: boolean = false;
  private isPressed: boolean = false;
  private onClickCallback?: (globalX: number, globalY: number) => void;

  constructor(onClick?: (globalX: number, globalY: number) => void) {
    super();
    this.onClickCallback = onClick;

    // Load the 3 entity images provided by the user
    this.entityTextures = [
      IconManager.getTexture('/assets/entity/entity_orb_1.png'),
      IconManager.getTexture('/assets/entity/entity_orb_2.png'),
      IconManager.getTexture('/assets/entity/entity_orb_3.png')
    ];

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

    // Main Entity Sprite using the custom uploaded art
    this.entitySprite = new Sprite(this.entityTextures[0]);
    this.entitySprite.anchor.set(0.5);
    this.entitySprite.width = 175;
    this.entitySprite.height = 175;
    this.addChild(this.entitySprite);

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
    this.coreGraphics.circle(0, 0, r - 2);
    this.coreGraphics.fill({ color: 0x050505 });
    this.coreGraphics.stroke({ width: 1.5, color: THEME.colors.cardBorderLight, alpha: 0.6 });
  }

  private setupInteractivity(): void {
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerenter', () => {
      this.isHovered = true;
      this.targetScale = 1.05;
    });

    this.on('pointerleave', () => {
      this.isHovered = false;
      this.isPressed = false;
      this.targetScale = 1.0;
    });

    this.on('pointerdown', (e) => {
      this.isPressed = true;
      this.bounceScale = 0.90;
      this.clickFlashTimer = 0.18;

      // Cycle to active power frames on click for dynamic mechanical feedback
      this.currentFrameIndex = (this.currentFrameIndex + 1) % this.entityTextures.length;
      this.entitySprite.texture = this.entityTextures[this.currentFrameIndex];

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

  public triggerClick(customX?: number, customY?: number): void {
    this.isPressed = true;
    this.bounceScale = 0.90;
    this.clickFlashTimer = 0.18;

    this.currentFrameIndex = (this.currentFrameIndex + 1) % this.entityTextures.length;
    this.entitySprite.texture = this.entityTextures[this.currentFrameIndex];

    const globalPos = this.getGlobalPosition();
    const clickX = customX ?? globalPos.x;
    const clickY = customY ?? globalPos.y;

    if (this.onClickCallback) {
      this.onClickCallback(clickX, clickY);
    }

    setTimeout(() => {
      this.isPressed = false;
      this.bounceScale = 1.12;
    }, 80);
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

    // 2. Click flash & animation
    if (this.clickFlashTimer > 0) {
      this.clickFlashTimer -= dt;
      this.entitySprite.alpha = 1.0;
    } else {
      // Subtle idle pulse between frames
      this.animTimer += dt;
      if (this.animTimer >= 2.5) {
        this.animTimer = 0;
        this.currentFrameIndex = (this.currentFrameIndex + 1) % this.entityTextures.length;
        this.entitySprite.texture = this.entityTextures[this.currentFrameIndex];
      }
    }

    // 3. Smooth spring interpolation for bounce scale
    const target = this.isPressed ? 0.9 : this.targetScale;
    this.bounceScale += (target - this.bounceScale) * Math.min(1, dt * 18);
    this.scale.set(this.bounceScale);

    // 4. Subtle floating breathing of divine entity orb
    const breath = Math.sin(performance.now() * 0.0025) * 3;
    this.entitySprite.position.y = breath;
  }
}
