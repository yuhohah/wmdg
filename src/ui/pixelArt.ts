// Pixel-art sprites for the courtyard devotees and the Incarnation avatar.
// Each sprite is a character map + palette, rasterised once into a canvas and reused every frame.

type Palette = Record<string, string>;

function rasterise(rows: string[], palette: Palette): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = rows[0].length;
  canvas.height = rows.length;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return canvas;
}

// Front-facing figures are authored as their left half and mirrored
function mirror(half: string[]): string[] {
  return half.map((row) => row + row.split('').reverse().join(''));
}

function paint(rows: string[], overlay: Array<[number, number, string]>): string[] {
  const grid = rows.map((r) => r.split(''));
  for (const [x, y, ch] of overlay) {
    if (grid[y] && x >= 0 && x < grid[y].length) grid[y][x] = ch;
  }
  return grid.map((r) => r.join(''));
}

// ---------------------------------------------------------------------------
// Courtyard devotees — 12x16 side profile facing right
// o outline · d/r/l robe shade/base/light · h hood shadow · f face · k hands · b rope belt · e feet
// ---------------------------------------------------------------------------

const DEVOTEE_BODY = [
  '....ooo.....',
  '...odrlo....',
  '..odrrrlo...',
  '..odrrhho...',
  '..odrhhfo...',
  '..odrrhho...',
  '...odrrlo...',
  '..odrrrrlo..',
  '..odrrrrkko.',
  '.odrrrrrrlo.',
  '.odbbbbbblo.',
  '.odrrrrrrrlo',
  'odrrrrrrrrlo',
  'odrrrrrrrrlo',
  'oodddddddooo',
];

const DEVOTEE_FEET = ['..ee....ee..', '...ee..ee...', '....eeee....', '...ee..ee...'];

// Kneeling in prayer, then bowing deeper
const DEVOTEE_PRAY = [
  [
    '............',
    '............',
    '............',
    '............',
    '...ooo......',
    '..odrlo.....',
    '.odrrrlokk..',
    '.odrrhhokk..',
    '.odrhhfo....',
    '.odrrhho....',
    'odrrrrrlo...',
    'odbbbbbblo..',
    'odrrrrrrrlo.',
    'odrrrrrrrrlo',
    'oodddddddooo',
    '............',
  ],
  [
    '............',
    '............',
    '............',
    '............',
    '............',
    '....ooo.....',
    '..odrrlokk..',
    '.odrrrrlokk.',
    '.odrrrhho...',
    '.odrrhhfo...',
    'odrrrrhho...',
    'odbbbbbblo..',
    'odrrrrrrrlo.',
    'odrrrrrrrrlo',
    'oodddddddooo',
    '............',
  ],
];

const DEVOTEE_BASE: Palette = {
  o: '#0d0a08',
  h: '#1a1411',
  f: '#d4ad86',
  k: '#d4ad86',
  e: '#2b221c',
  b: '#b88a4a',
};

const ROBES: Array<[string, string, string]> = [
  ['#8e8471', '#bfb39a', '#e3d8bf'], // bone
  ['#5f5a55', '#86807a', '#ada79f'], // ash
  ['#33314f', '#4d4a78', '#7470a8'], // indigo
  ['#523a28', '#7a5a40', '#a17a57'], // umber
  ['#4a3a54', '#6a5577', '#8f78a0'], // violet
  ['#552520', '#7c3b33', '#a4544a'], // ember
];

export interface DevoteeSheet {
  canvas: HTMLCanvasElement;
  frameW: number;
  frameH: number;
  variants: number;
  walkFrames: number; // columns 0..3
  prayColumn: number; // columns 4..5
}

let devoteeSheet: DevoteeSheet | null = null;

// One canvas: columns = 4 walk + 2 pray frames, rows = robe palettes
export function getDevoteeSheet(): DevoteeSheet {
  if (devoteeSheet) return devoteeSheet;
  const frameW = 12;
  const frameH = 16;
  const frames = [
    ...DEVOTEE_FEET.map((feet) => [...DEVOTEE_BODY, feet]),
    ...DEVOTEE_PRAY,
  ];
  const canvas = document.createElement('canvas');
  canvas.width = frameW * frames.length;
  canvas.height = frameH * ROBES.length;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ROBES.forEach(([d, r, l], row) => {
      const palette = { ...DEVOTEE_BASE, d, r, l };
      frames.forEach((rows, col) => ctx.drawImage(rasterise(rows, palette), col * frameW, row * frameH));
    });
  }
  devoteeSheet = { canvas, frameW, frameH, variants: ROBES.length, walkFrames: 4, prayColumn: 4 };
  return devoteeSheet;
}

// ---------------------------------------------------------------------------
// Incarnation avatar — 24x32 front view, five stages of ascension
// e eyes · g gold trim · w white hair/beard · s staff · p staff orb
// ---------------------------------------------------------------------------

const AVATAR_HOODED = [
  '..........oo',
  '.........olr',
  '........olrr',
  '.......olrrr',
  '......olrrrr',
  '......olrrhh',
  '.....olrrhhh',
  '.....olrhhhh',
  '.....olrhhhf',
  '.....olrhheh',
  '.....olrhhff',
  '.....olrrhhf',
  '....oolrrrhh',
  '...oolrrrrrr',
  '..oolrrrrrrr',
  '..olrrrrrrrr',
  '..olrrrrrrrd',
  '..olrrrrrkkk',
  '..olrrrrrkkk',
  '..olrrrrrrrd',
  '.olrrrrrrrrd',
  '.olrrrrrrrrd',
  '.olrrrrrrrrd',
  '.olrrrrrrrrd',
  '.olrrrrrrrrd',
  'olrrrrrrrrrd',
  'olrrrrrrrrrd',
  'olrrrrrrrrrd',
  'olrrrrrrrrrd',
  'olrrrrrrrrrd',
  'olllrrrrrrrd',
  'oooooooooooo',
];

// Elder: hood lowered onto the shoulders, white hair and a long beard
const AVATAR_ELDER = [
  '............',
  '............',
  '.........ooo',
  '........owww',
  '.......owwff',
  '.......owfff',
  '.......owfff',
  '.......owfef',
  '.......owfff',
  '.......owwff',
  '.......owwww',
  '....ooolwwww',
  '...oolrrowww',
  '..oolrrrrwww',
  '..olrrrrrwww',
  '..olrrrrrrww',
  '..olrrrrrrrw',
  '..olrrrrrkkk',
  '..olrrrrrkkk',
  '..olrrrrrrrd',
  '.olrrrrrrrrd',
  '.olrrrrrrrrd',
  '.olrrrrrrrrd',
  '.olrrrrrrrrd',
  '.olrrrrrrrrd',
  'olrrrrrrrrrd',
  'olrrrrrrrrrd',
  'olrrrrrrrrrd',
  'olrrrrrrrrrd',
  'olrrrrrrrrrd',
  'olllrrrrrrrd',
  'oooooooooooo',
];

// Gold filigree on the left half: stole down the front, cuffs and hem bands
const TRIM: Array<[number, number, string]> = [
  ...Array.from({ length: 13 }, (_, i): [number, number, string] => [10, 18 + i, 'g']),
  [8, 17, 'g'], [8, 18, 'g'],
  ...Array.from({ length: 10 }, (_, i): [number, number, string] => [1 + i, 29, 'g']),
];

function trimmed(rows: string[]): string[] {
  const half = rows.map((r) => r);
  return paint(half, TRIM);
}

// The staff sits in the figure's right hand, so it is painted after mirroring
function withStaff(rows: string[]): string[] {
  const overlay: Array<[number, number, string]> = [];
  for (let y = 4; y < 31; y++) overlay.push([18, y, 's']);
  overlay.push([17, 2, 'p'], [18, 2, 'p'], [19, 2, 'p'], [17, 3, 'p'], [18, 3, 'p'], [19, 3, 'p'], [18, 1, 'p']);
  overlay.push([16, 17, 'k'], [17, 17, 'k'], [17, 18, 'k']);
  return paint(rows, overlay);
}

export interface AvatarStageArt {
  sprite: HTMLCanvasElement;
  aura: 'none' | 'embers' | 'motes' | 'eclipse' | 'solar';
  particleColors: string[];
}

const AVATAR_STAGES: Record<number, () => AvatarStageArt> = {
  1: () => ({
    sprite: rasterise(mirror(AVATAR_HOODED), {
      o: '#0d0a08', d: '#5f5a55', r: '#86807a', l: '#ada79f', h: '#15110e', f: '#2a211b', e: '#2a211b', k: '#c9a27a',
    }),
    aura: 'none',
    particleColors: ['#e8dcc0', '#a39a86'],
  }),
  2: () => ({
    sprite: rasterise(mirror(trimmed(AVATAR_HOODED)), {
      o: '#0d0a08', d: '#3d2a22', r: '#5c3d30', l: '#7d5544', h: '#120d0a', f: '#2a1d16', e: '#ffb35c', k: '#d4ad86', g: '#d6a85a',
    }),
    aura: 'embers',
    particleColors: ['#ffb35c', '#d6a85a', '#e8dcc0'],
  }),
  3: () => ({
    sprite: rasterise(withStaff(mirror(trimmed(AVATAR_ELDER))), {
      o: '#0d0a08', d: '#2c2945', r: '#423e66', l: '#625c92', w: '#ece4d2', f: '#d4ad86', e: '#2a211b', k: '#d4ad86',
      g: '#c49850', s: '#8a6a44', p: '#e8dcc0',
    }),
    aura: 'motes',
    particleColors: ['#b8b0e0', '#e8dcc0', '#c49850'],
  }),
  4: () => ({
    sprite: rasterise(mirror(trimmed(AVATAR_HOODED)), {
      o: '#000000', d: '#0b0910', r: '#141018', l: '#8f7fc8', h: '#050407', f: '#050407', e: '#e9e4ff', k: '#3a3150', g: '#6d5fa8',
    }),
    aura: 'eclipse',
    particleColors: ['#b8b0e0', '#8f7fc8', '#e9e4ff'],
  }),
  5: () => ({
    sprite: rasterise(mirror(trimmed(AVATAR_HOODED)), {
      o: '#3a2a12', d: '#b8923e', r: '#e8d39a', l: '#fff3cf', h: '#8a6a2c', f: '#fff0c8', e: '#ffffff', k: '#fff0c8', g: '#ffd36b',
    }),
    aura: 'solar',
    particleColors: ['#ffd36b', '#fff3cf', '#c49850'],
  }),
};

const avatarCache = new Map<number, AvatarStageArt>();

export function getAvatarArt(stage: number): AvatarStageArt {
  const key = Math.min(5, Math.max(1, stage));
  let art = avatarCache.get(key);
  if (!art) {
    art = AVATAR_STAGES[key]();
    avatarCache.set(key, art);
  }
  return art;
}
