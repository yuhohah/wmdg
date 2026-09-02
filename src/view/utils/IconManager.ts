import { Texture, CanvasSource, Assets } from 'pixi.js';

export class IconManager {
  private static cachedTextures: Map<string, Texture> = new Map();

  /**
   * Get texture with guaranteed fallback so missing asset files never crash the game
   */
  public static getTexture(name: string): Texture {
    if (this.cachedTextures.has(name)) {
      return this.cachedTextures.get(name)!;
    }

    try {
      if (Assets.has(name)) {
        const loaded = Assets.get(name);
        if (loaded && loaded instanceof Texture) {
          this.cachedTextures.set(name, loaded);
          return loaded;
        }
      }

      const tex = Texture.from(name);
      if (tex && tex.width > 1 && tex.height > 1) {
        this.cachedTextures.set(name, tex);
        return tex;
      }
    } catch {
      // Fallback to generated canvas texture
    }

    const fallback = this.generateFallbackTexture(name);
    this.cachedTextures.set(name, fallback);
    return fallback;
  }

  private static generateFallbackTexture(name: string): Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return Texture.EMPTY;
    }

    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;

    if (name.includes('flame')) {
      // Stylized Flame icon
      ctx.beginPath();
      ctx.moveTo(32, 8);
      ctx.bezierCurveTo(46, 24, 52, 40, 42, 54);
      ctx.bezierCurveTo(36, 62, 28, 62, 22, 54);
      ctx.bezierCurveTo(12, 40, 18, 24, 32, 8);
      ctx.fill();
    } else if (name.includes('star')) {
      // Stylized 4-point celestial star
      ctx.beginPath();
      ctx.moveTo(32, 6);
      ctx.quadraticCurveTo(32, 32, 58, 32);
      ctx.quadraticCurveTo(32, 32, 32, 58);
      ctx.quadraticCurveTo(32, 32, 6, 32);
      ctx.quadraticCurveTo(32, 32, 32, 6);
      ctx.fill();
    } else if (name.includes('shrine') || name.includes('sacerdote')) {
      // Stylized Priest / Torii Shrine icon
      ctx.beginPath();
      ctx.arc(32, 20, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(18, 56);
      ctx.quadraticCurveTo(32, 32, 46, 56);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(32, 20, 16, Math.PI, Math.PI * 2);
      ctx.stroke();
    } else if (name.includes('cathedral') || name.includes('temple')) {
      // Stylized Gothic Temple Cathedral icon
      ctx.beginPath();
      ctx.moveTo(32, 8);
      ctx.lineTo(52, 28);
      ctx.lineTo(52, 56);
      ctx.lineTo(12, 56);
      ctx.lineTo(12, 28);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.fillRect(26, 36, 12, 20);
    } else if (name.includes('monument')) {
      // Stylized Obelisk / Monolith icon
      ctx.beginPath();
      ctx.moveTo(32, 6);
      ctx.lineTo(44, 20);
      ctx.lineTo(40, 56);
      ctx.lineTo(24, 56);
      ctx.lineTo(20, 20);
      ctx.closePath();
      ctx.fill();
    } else {
      // Default geometric diamond
      ctx.beginPath();
      ctx.moveTo(32, 10);
      ctx.lineTo(54, 32);
      ctx.lineTo(32, 54);
      ctx.lineTo(10, 32);
      ctx.closePath();
      ctx.fill();
    }

    const source = new CanvasSource({ resource: canvas });
    return new Texture({ source });
  }
}
