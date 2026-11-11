import { describe, expect, it } from 'vitest';
import { isShippedAsset } from './shippedAssets.js';

describe('assets published with the game', () => {
  it.each([
    'assets/background_music.mp3',
    'assets/boss_battle.mp3',
    'assets/backgrounds/followers-courtyard-v1.webp',
    'assets/backgrounds/incarnation-sanctuary-v1.webp',
    'assets/concepts/encarnacao/01-neofito.png',
    'assets/sprites/fieis/iniciado/andar/spritesheet.png',
    'assets/sprites/encarnacao/01-neofito/andar/spritesheet.png',
    'assets/sprites/bosses/lateral/01-anubis/idle.png',
    'assets/sprites/bosses/lateral/01-anubis/ataque-balanca/spritesheet.png',
    'assets/sprites/bosses/lateral/01-anubis/derrota/spritesheet.png',
    'assets/sprites/bosses/lateral/02-hades/derrota/spritesheet.png',
    'assets/sprites/bosses/lateral/03-odin/derrota/spritesheet.png',
    'assets/sprites/bosses/caos-referencia-v2/derrota/spritesheet.png',
    'assets/sprites/bosses/caos-referencia-v2/idle.png',
    'assets/sprites/bosses/caos-referencia-v2/ataque-circulos/spritesheet.png',
    'assets/sprites/esfera/layers/still.png',
    'assets/sphere/progression/plenitude.apng',
    'assets/sphere/progression/plenitude.png',
    'assets/hud/vt323.ttf',
    'assets/hud/VT323-LICENSE.txt',
    'assets/board/void-stars-a.svg',
    'assets/patio_fieis_bg.jpg',
    'assets/cult_bg_landscape.jpg',
    'assets/index-abc123.js',
    'index.html',
  ])('keeps %s', path => {
    expect(isShippedAsset(path)).toBe(true);
  });

  it.each([
    'assets/concepts/esfera-pixellab-v1/references/esfera.png',
    'assets/concepts/esfera-pixellab-v1/animations/04/preview.html',
    'assets/concepts/bosses/anubis.png',
    'assets/sprites/fieis/iniciado/andar/00.png',
    'assets/sprites/bosses/01-anubis/andar/00.png',
    'assets/sprites/bosses/01-anubis/andar/spritesheet.png',
    'assets/sprites/bosses/caos-referencia-v2/reference.png',
    'assets/sprites/bosses/manifest.json',
    'assets/sprites/bosses/preview.html',
    'assets/sprites/fieis/README.md',
    'assets/sprites/esfera/girar/spritesheet.png',
    'assets/sprites/esfera/girar/preview.gif',
    'assets/backgrounds/followers-courtyard-v1.png',
    'assets/backgrounds/followers-courtyard-v1.prompt.txt',
    'assets/sphere/progression/generate.py',
    'assets/sphere/orbitas-vector/aros-animados.svg',
    'assets/sphere/orbitas-vector/orbitas-animada.svg',
  ])('leaves out %s', path => {
    expect(isShippedAsset(path)).toBe(false);
  });
});
