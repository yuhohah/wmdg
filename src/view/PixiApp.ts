import { Application, Assets } from 'pixi.js';
import { GameEngine } from '../engine/GameEngine';
import { GameScreen } from './screens/GameScreen';
import { THEME } from './theme';

export class PixiApp {
  public app!: Application;
  private engine: GameEngine;
  private gameScreen!: GameScreen;
  private containerElement: HTMLElement;

  constructor(engine: GameEngine, containerElement: HTMLElement) {
    this.engine = engine;
    this.containerElement = containerElement;
  }

  public async init(): Promise<void> {
    this.app = new Application();

    await this.app.init({
      background: THEME.colors.bgDark,
      resizeTo: window,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true
    });

    // In PixiJS v8, the canvas element is accessed via app.canvas
    this.containerElement.appendChild(this.app.canvas);

    // Preload custom monochromatic icon assets
    await Assets.load([
      '/assets/icons/icon_entity_eye.png',
      '/assets/icons/icon_flame.png',
      '/assets/icons/icon_star.png',
      '/assets/icons/icon_shrine.png',
      '/assets/icons/icon_cathedral.png'
    ]);

    // Initialize View Screen
    this.gameScreen = new GameScreen(this.engine);
    this.app.stage.addChild(this.gameScreen);

    // Initial resize layout
    this.handleResize();

    // Hook Pixi ticker for visual animations (interpolations, floating text, particles)
    this.app.ticker.add((ticker) => {
      // dt in seconds
      const dt = ticker.deltaTime / 60;
      this.gameScreen.update(dt);
    });

    // Window Resize Handler
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  private handleResize(): void {
    if (!this.app || !this.gameScreen) return;
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    this.gameScreen.resize(width, height);
  }
}
