import { ALTAR_X, CROWD_AREA, CROWD_LEVELS, STAGE_SIZE } from '../features/church/churchConfig.js';
import type { CrowdLevel } from '../features/church/churchScene.js';

/** The PixelLab silhouette sheet: equal cells side by side, feet on each cell's bottom row, facing left. */
const SHEET = { src: '/assets/church/crowd/silhouettes.png', cellWidth: 23, cellHeight: 29, cells: 11 };
/** Canvas pixels per stage pixel. */
const RESOLUTION = 3;
/** Canvas pixels per sheet pixel: a silhouette stands about two thirds as tall as a follower. */
const SHEET_SCALE = 2;

interface Silhouette { x: number; feet: number; cell: number; shade: number }

/** Every silhouette the crowd can hold, in the order they join; each level shows a longer prefix. */
const SILHOUETTES = layOutCrowd(CROWD_LEVELS[CROWD_LEVELS.length - 1].silhouettes);

/** Silhouettes behind the yard; the layer sits under the followers, so it never covers them. */
export class ChurchCrowd {
  private sheet = new Image();
  private level: CrowdLevel = 0;

  constructor(private canvas: HTMLCanvasElement) {
    canvas.width = STAGE_SIZE.width * RESOLUTION;
    canvas.height = STAGE_SIZE.height * RESOLUTION;
    this.sheet.addEventListener('load', () => this.draw());
    this.sheet.src = SHEET.src;
  }

  show(level: CrowdLevel): void {
    if (level === this.level) return;
    this.level = level;
    this.draw();
  }

  private draw(): void {
    const context = this.canvas.getContext('2d')!;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.hidden = this.level === 0;
    if (this.level === 0 || !this.sheet.complete) return;
    context.imageSmoothingEnabled = false;
    const width = SHEET.cellWidth * SHEET_SCALE;
    const height = SHEET.cellHeight * SHEET_SCALE;
    // Farther figures (higher feet) are drawn first so nearer ones overlap them.
    const visible = SILHOUETTES.slice(0, CROWD_LEVELS[this.level - 1].silhouettes).sort((a, b) => a.feet - b.feet);
    for (const { x, feet, cell, shade } of visible) {
      context.save();
      context.filter = `brightness(${shade})`;
      context.translate(Math.round(x * RESOLUTION), Math.round(feet * RESOLUTION));
      // The art faces left; mirror the figures left of the altar so everyone faces it.
      if (x < ALTAR_X) context.scale(-1, 1);
      context.drawImage(this.sheet, cell * SHEET.cellWidth, 0, SHEET.cellWidth, SHEET.cellHeight, -width / 2, -height, width, height);
      context.restore();
    }
  }
}

function layOutCrowd(count: number): Silhouette[] {
  const random = mulberry32(CROWD_AREA.seed);
  const { ground, clear, depth } = CROWD_AREA;
  const left = ground[0].x;
  const span = ground[ground.length - 1].x - left - (clear.to - clear.from);
  const silhouettes: Silhouette[] = [];
  for (let index = 0; index < count; index++) {
    // Pick along the ground with the altar gap cut out, so no draw is wasted on rejection.
    let x = left + random() * span;
    if (x >= clear.from) x += clear.to - clear.from;
    silhouettes.push({
      x,
      feet: groundAt(x) - random() * depth,
      cell: Math.floor(random() * SHEET.cells),
      shade: 0.65 + random() * 0.3
    });
  }
  return silhouettes;
}

function groundAt(x: number): number {
  const { ground } = CROWD_AREA;
  for (let index = 1; index < ground.length; index++) {
    const to = ground[index];
    const from = ground[index - 1];
    if (x <= to.x) return from.feet + ((x - from.x) / (to.x - from.x)) * (to.feet - from.feet);
  }
  return ground[ground.length - 1].feet;
}

/** Small seeded PRNG: the same seed always yields the same crowd. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
