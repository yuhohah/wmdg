// public/ also holds art sources: concepts, loose frames, previews and generation scripts.
// They stay in the repository, but the published build carries only what the game loads.
const LEFT_OUT = [
  /^assets\/sphere\/orbitas-vector\//,
  /^assets\/patio_fieis_bg\.jpg$/,
  /^assets\/procession\/landscape\.png$/,
  /\.(py|md|html|gif)$/,
  /\.prompt\.txt$/,
  /^assets\/backgrounds\/.*\.png$/,
];

const SPRITES_IN_USE = [
  /^assets\/sprites\/fieis\/[^/]+\/[^/]+\/spritesheet\.png$/,
  /^assets\/sprites\/encarnacao\/[^/]+\/andar\/spritesheet\.png$/,
  // Caos Primordial is drawn from its reference folder, not from lateral/
  /^assets\/sprites\/bosses\/(lateral\/[^/]+|caos-referencia-v2)\/idle\.png$/,
  /^assets\/sprites\/bosses\/(lateral\/[^/]+|caos-referencia-v2)\/[^/]+\/spritesheet\.png$/,
  /^assets\/sprites\/esfera\/layers\/still\.png$/,
];

export function isShippedAsset(path: string): boolean {
  if (path === 'index.html') return true;
  if (LEFT_OUT.some(pattern => pattern.test(path))) return false;
  // Sphere forms and the autoclick satellite still load these images at runtime.
  if (path.startsWith('assets/sphere/progression/')) {
    return /^assets\/sphere\/progression\/(nucleo|engraved-globe|meridian-globe|hollow-globe)\.png$/.test(path);
  }
  if (path.startsWith('assets/concepts/')) return /^assets\/concepts\/encarnacao\/[^/]+\.png$/.test(path);
  if (path.startsWith('assets/sprites/')) return SPRITES_IN_USE.some(pattern => pattern.test(path));
  return true;
}
