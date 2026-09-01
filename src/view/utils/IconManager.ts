import { Texture, CanvasSource } from 'pixi.js';

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
      const tex = Texture.from(name);
      if (tex) {
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
    } else if (name.includes('shrine')) {
      // Stylized Torii Shrine / Alter icon
      ctx.fillRect(10, 14, 44, 6);
      ctx.fillRect(14, 24, 36, 4);
      ctx.fillRect(18, 24, 6, 32);
      ctx.fillRect(40, 24, 6, 32);
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
