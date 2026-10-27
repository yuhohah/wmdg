// Generates the game's engraved vector art (dark-hermetic-art, "Nocturnal Void Mode"):
// bone-white linework on soot black, gold kept to a faint accent.
//
//   node scripts/generate-celestial-art.mjs
//
// Outputs:
//   public/assets/board/void-stars-a.svg / void-stars-b.svg  seamless star tiles, layered at different sizes
//   public/assets/board/celestial-chart.svg                  astrological chart centred on the Sphere
//   public/assets/board/armillary-sphere.svg                 the Sphere, flattened (start screen)
//   public/assets/board/sphere-{rings-back,globe,rings-front}.svg  the Sphere as animatable layers (board)
//   public/assets/ui/astral-frame.svg                        9-slice border-image frame for plates and buttons

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets');
const OUT = join(ASSETS, 'board');
const UI_OUT = join(ASSETS, 'ui');
mkdirSync(OUT, { recursive: true });
mkdirSync(UI_OUT, { recursive: true });

const BONE = '#e8dcc0';
const GOLD = '#c49850';

// Deterministic PRNG so regenerating yields the same art
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => Math.round(n * 10) / 10;
const polar = (cx, cy, r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

// ---------------------------------------------------------------------------
// Star tiles
// ---------------------------------------------------------------------------

function starTile(size, seed, { dots, crosses, gold }) {
  const rand = rng(seed);
  const pad = 14; // keep marks off the seam so tiles join invisibly
  const pos = () => [pad + rand() * (size - pad * 2), pad + rand() * (size - pad * 2)];
  const parts = [];

  for (let i = 0; i < dots; i++) {
    const [x, y] = pos();
    const r = 0.5 + rand() * rand() * 1.3;
    const o = 0.12 + rand() * 0.4;
    parts.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${BONE}" opacity="${f(o * 100) / 100}"/>`);
  }

  // Engraved four-point stars: a long and a short cross, like woodcut star charts
  for (let i = 0; i < crosses; i++) {
    const [x, y] = pos();
    const l = 4 + rand() * 6;
    const s = l * 0.45;
    const o = 0.3 + rand() * 0.25;
    const color = i < gold ? GOLD : BONE;
    parts.push(
      `<g stroke="${color}" stroke-width="0.9" opacity="${f(o * 100) / 100}" stroke-linecap="round">` +
        `<line x1="${f(x - l)}" y1="${f(y)}" x2="${f(x + l)}" y2="${f(y)}"/>` +
        `<line x1="${f(x)}" y1="${f(y - l)}" x2="${f(x)}" y2="${f(y + l)}"/>` +
        `<line x1="${f(x - s)}" y1="${f(y - s)}" x2="${f(x + s)}" y2="${f(y + s)}" stroke-width="0.6"/>` +
        `<line x1="${f(x - s)}" y1="${f(y + s)}" x2="${f(x + s)}" y2="${f(y - s)}" stroke-width="0.6"/>` +
        `</g>`
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${parts.join('')}</svg>\n`;
}

// ---------------------------------------------------------------------------
// Celestial chart
// ---------------------------------------------------------------------------

// Classical alchemical element triangles, drawn as strokes so they never fall back to emoji glyphs
function elementGlyph(x, y, size, element) {
  const h = size * 0.87;
  const up = element === 'fire' || element === 'air';
  const top = up ? y - h / 2 : y + h / 2;
  const base = up ? y + h / 2 : y - h / 2;
  const tri = `M${f(x)} ${f(top)} L${f(x + size / 2)} ${f(base)} L${f(x - size / 2)} ${f(base)} Z`;
  const bar = element === 'air' || element === 'earth'
    ? `<line x1="${f(x - size * 0.42)}" y1="${f(y)}" x2="${f(x + size * 0.42)}" y2="${f(y)}"/>`
    : '';
  return `<path d="${tri}"/>${bar}`;
}

function circle(cx, cy, r, opacity, width = 1.2, extra = '') {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${BONE}" stroke-width="${width}" opacity="${opacity}"${extra}/>`;
}

function chart() {
  const S = 2800;
  const c = S / 2;
  const p = [];
  const rand = rng(7);

  // Inner seal hugging the Sphere's frame
  p.push(circle(c, c, 205, 0.35, 1.4));
  p.push(circle(c, c, 216, 0.18, 0.8));

  // Rays of astral breath streaming out of the Sphere
  for (let i = 0; i < 96; i++) {
    const deg = i * 3.75;
    const long = i % 4 === 0;
    const [x1, y1] = polar(c, c, 232, deg);
    const [x2, y2] = polar(c, c, long ? 350 : 300 + rand() * 25, deg);
    p.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${BONE}" stroke-width="${long ? 1 : 0.6}" opacity="${long ? 0.16 : 0.09}"/>`);
  }

  // Degree scale band
  p.push(circle(c, c, 372, 0.22, 1.2));
  for (let d = 0; d < 360; d++) {
    const len = d % 10 === 0 ? 22 : d % 5 === 0 ? 13 : 6;
    const [x1, y1] = polar(c, c, 372, d);
    const [x2, y2] = polar(c, c, 372 + len, d);
    p.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${BONE}" stroke-width="${d % 10 === 0 ? 1 : 0.6}" opacity="${d % 10 === 0 ? 0.24 : 0.14}"/>`);
  }
  p.push(circle(c, c, 400, 0.22, 1.2));

  // Zodiac band: twelve houses, each marked with its element (Aries fire, Taurus earth, Gemini air, Cancer water…)
  const elements = ['fire', 'earth', 'air', 'water'];
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = polar(c, c, 400, i * 30);
    const [x2, y2] = polar(c, c, 484, i * 30);
    p.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${BONE}" stroke-width="1" opacity="0.24"/>`);
    const [gx, gy] = polar(c, c, 442, i * 30 + 15);
    const gold = i % 3 === 0;
    p.push(`<g fill="none" stroke="${gold ? GOLD : BONE}" stroke-width="1.6" stroke-linejoin="round" opacity="${gold ? 0.5 : 0.32}">${elementGlyph(gx, gy, 26, elements[i % 4])}</g>`);
  }
  p.push(circle(c, c, 484, 0.22, 1.2));
  p.push(circle(c, c, 494, 0.1, 0.8));

  // Emerald Tablet epigraphy
  const motto = 'QVOD EST SVPERIVS EST SICVT QVOD INFERIVS ✦ ET QVOD EST INFERIVS EST SICVT QVOD SVPERIVS ✦ AD PERPETRANDA MIRACVLA REI VNIVS ✦ ';
  p.push(`<path id="motto" d="M ${c} ${c - 540} a 540 540 0 1 1 -0.1 0" fill="none"/>`);
  p.push(`<text font-family="Georgia, 'Times New Roman', serif" font-size="27" letter-spacing="6.2" fill="${BONE}" opacity="0.24"><textPath href="#motto">${motto}</textPath></text>`);
  p.push(circle(c, c, 582, 0.16, 1));

  // House lines running out into the void, fading in steps (engraving, not airbrush)
  for (let i = 0; i < 12; i++) {
    const deg = i * 30;
    [[582, 820, 0.1], [820, 1060, 0.06], [1060, 1320, 0.03]].forEach(([r1, r2, o]) => {
      const [x1, y1] = polar(c, c, r1, deg);
      const [x2, y2] = polar(c, c, r2, deg);
      p.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${BONE}" stroke-width="0.9" opacity="${o}"/>`);
    });
  }

  // Unclosed planetary orbits with their wandering stars
  [[780, 0.1, 38, 'none'], [1000, 0.07, 212, '18 10'], [1240, 0.045, 128, '4 14']].forEach(([r, o, deg, dash]) => {
    p.push(circle(c, c, r, o, 1, dash === 'none' ? '' : ` stroke-dasharray="${dash}"`));
    const [px, py] = polar(c, c, r, deg);
    p.push(`<g fill="none" stroke="${BONE}" stroke-width="1.2" opacity="${Math.min(0.4, o * 4)}"><circle cx="${f(px)}" cy="${f(py)}" r="9"/><circle cx="${f(px)}" cy="${f(py)}" r="1.8" fill="${BONE}"/></g>`);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${p.join('')}</svg>\n`;
}

// ---------------------------------------------------------------------------
// Armillary sphere
// ---------------------------------------------------------------------------
// Large central globe inside tube-like rings, after the reference engraving.
// Split into three layers sharing one 512 grid so the rings can animate around a still globe:
//   rings-back (far halves + axis) → globe → rings-front (near halves, caps, outer meridian)

const SPHERE = 512;
const SC = SPHERE / 2;
const GLOBE_R = 150;

// A ring seen slightly from above: the lower arc faces the viewer
function ringArcs(cy, rx, ry) {
  return {
    back: `M${f(SC - rx)} ${f(cy)} A${rx} ${ry} 0 0 1 ${f(SC + rx)} ${f(cy)}`,
    front: `M${f(SC - rx)} ${f(cy)} A${rx} ${ry} 0 0 0 ${f(SC + rx)} ${f(cy)}`,
  };
}

// Tube rings drawn as two parallel rails, like hoops of bent brass
const TUBES = [
  { cy: SC - 74, rx: 214, ry: 30, gap: 7 },
  { cy: SC + 46, rx: 236, ry: 56, gap: 13 },
];

const CAPS = [
  { cy: SC - 196, rx: 76, ry: 17, gap: 6 },
  { cy: SC + 196, rx: 76, ry: 17, gap: 6 },
];

function sphereSvg(body, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SPHERE}" height="${SPHERE}" viewBox="0 0 ${SPHERE} ${SPHERE}">` +
    (defs ? `<defs>${defs}</defs>` : '') + body + `</svg>\n`;
}

function sphereRingsBack() {
  const paths = [];
  for (const t of TUBES) {
    paths.push(ringArcs(t.cy, t.rx, t.ry).back, ringArcs(t.cy + t.gap, t.rx - 2, t.ry - 2).back);
  }
  return sphereSvg(
    `<g fill="none" stroke="${BONE}" stroke-width="3" opacity="0.45"><path d="${paths.join('')}"/></g>` +
    `<line x1="${SC}" y1="40" x2="${SC}" y2="${SPHERE - 40}" stroke="${BONE}" stroke-width="3"/>`
  );
}

function sphereGlobe() {
  const r = GLOBE_R;
  const bandY = SC + 12;
  const defs =
    `<clipPath id="g"><circle cx="${SC}" cy="${SC}" r="${r}"/></clipPath>` +
    `<clipPath id="north"><rect x="0" y="0" width="${SPHERE}" height="${bandY}"/></clipPath>` +
    `<clipPath id="south"><rect x="0" y="${bandY + 14}" width="${SPHERE}" height="${SPHERE}"/></clipPath>` +
    // Engraver's shadow: the lit crescent (upper left) stays clean
    `<mask id="shade"><rect width="${SPHERE}" height="${SPHERE}" fill="#fff"/><circle cx="${SC - 46}" cy="${SC - 50}" r="${r + 6}" fill="#000"/></mask>`;

  const meridians = [];
  for (let k = 1; k <= 16; k++) {
    meridians.push(`<ellipse cx="${SC}" cy="${SC}" rx="${f((r * k) / 16)}" ry="${r}"/>`);
  }
  const southLines = [];
  for (let y = bandY + 18; y < SC + r; y += 6) {
    const half = Math.sqrt(Math.max(0, r * r - (y - SC) * (y - SC)));
    southLines.push(`<path d="M${f(SC - half)} ${y} Q${SC} ${y + 10} ${f(SC + half)} ${y}"/>`);
  }
  const hatch = [];
  for (let k = -2 * r; k <= 2 * r; k += 7) {
    hatch.push(`<line x1="${f(SC + k - r)}" y1="${f(SC - r)}" x2="${f(SC + k + r)}" y2="${f(SC + r)}"/>`);
  }

  return sphereSvg(
    `<circle cx="${SC}" cy="${SC}" r="${r}" fill="#0c0a08"/>` +
    `<g clip-path="url(#g)" fill="none" stroke="${BONE}">` +
      `<g clip-path="url(#north)" stroke-width="1.6" opacity="0.85">${meridians.join('')}</g>` +
      `<g clip-path="url(#south)" stroke-width="1.6" opacity="0.7">${southLines.join('')}</g>` +
      `<g mask="url(#shade)" stroke-width="1.2" opacity="0.45">${hatch.join('')}</g>` +
      `<path d="M${SC - r} ${bandY} Q${SC} ${bandY + 22} ${SC + r} ${bandY}" stroke-width="3"/>` +
      `<path d="M${SC - r} ${bandY + 14} Q${SC} ${bandY + 36} ${SC + r} ${bandY + 14}" stroke-width="3"/>` +
      `<line x1="${SC}" y1="${SC - r}" x2="${SC}" y2="${SC + r}" stroke-width="2.4"/>` +
    `</g>` +
    `<circle cx="${SC}" cy="${SC}" r="${r}" fill="none" stroke="${BONE}" stroke-width="3.4"/>`,
    defs
  );
}

function sphereRingsFront() {
  const tubes = [];
  for (const t of TUBES) {
    tubes.push(ringArcs(t.cy, t.rx, t.ry).front, ringArcs(t.cy + t.gap, t.rx - 2, t.ry - 2).front);
  }
  // Caps sit above and below the globe, so both halves are visible
  const caps = CAPS.map((c) =>
    `<ellipse cx="${SC}" cy="${c.cy}" rx="${c.rx}" ry="${c.ry}"/><ellipse cx="${SC}" cy="${c.cy + c.gap}" rx="${c.rx - 2}" ry="${c.ry - 1}"/>`
  ).join('');
  const axisStubs =
    `<line x1="${SC}" y1="40" x2="${SC}" y2="${SC - GLOBE_R}"/><line x1="${SC}" y1="${SC + GLOBE_R}" x2="${SC}" y2="${SPHERE - 40}"/>`;
  return sphereSvg(
    `<g fill="none" stroke="${BONE}">` +
      `<circle cx="${SC}" cy="${SC}" r="222" stroke-width="3.4"/><circle cx="${SC}" cy="${SC}" r="214" stroke-width="1.6" opacity="0.7"/>` +
      `<g stroke-width="3">${axisStubs}</g>` +
      `<g stroke-width="3.6">${caps}</g>` +
      `<path d="${tubes.join('')}" stroke-width="3.6"/>` +
    `</g>` +
    // Gold accents: the equatorial tube's rim and the axis pins
    `<path d="${ringArcs(TUBES[1].cy + TUBES[1].gap, TUBES[1].rx - 2, TUBES[1].ry - 2).front}" fill="none" stroke="${GOLD}" stroke-width="3.6"/>` +
    `<circle cx="${SC}" cy="34" r="8" fill="${GOLD}"/><circle cx="${SC}" cy="${SPHERE - 34}" r="8" fill="${GOLD}"/>`
  );
}

// Single flattened image (start screen) — the three layers stacked
function armillarySphere() {
  const strip = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\n$/, '');
  const globe = sphereGlobe();
  const defs = (globe.match(/<defs>(.*?)<\/defs>/) || [])[1] || '';
  return sphereSvg(strip(sphereRingsBack()) + strip(globe).replace(/<defs>.*?<\/defs>/, '') + strip(sphereRingsFront()), defs);
}

// ---------------------------------------------------------------------------
// Astral frame (border-image, slice 8): double gold rule with diamond corner studs
// ---------------------------------------------------------------------------

function astralFrame() {
  const studs = [[4, 4], [20, 4], [4, 20], [20, 20]]
    .map(([x, y]) => `<path d="M${x} ${y - 2.6}L${x + 2.6} ${y}L${x} ${y + 2.6}L${x - 2.6} ${y}z" fill="${GOLD}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">` +
    `<rect x="0.75" y="0.75" width="22.5" height="22.5" fill="none" stroke="${GOLD}" stroke-width="1.5" opacity="0.8"/>` +
    `<rect x="4" y="4" width="16" height="16" fill="none" stroke="${GOLD}" stroke-width="0.8" opacity="0.4"/>` +
    studs +
    `</svg>\n`;
}

writeFileSync(join(OUT, 'void-stars-a.svg'), starTile(1200, 11, { dots: 150, crosses: 7, gold: 1 }));
writeFileSync(join(OUT, 'void-stars-b.svg'), starTile(1730, 23, { dots: 90, crosses: 4, gold: 1 }));
writeFileSync(join(OUT, 'celestial-chart.svg'), chart());
writeFileSync(join(OUT, 'armillary-sphere.svg'), armillarySphere());
writeFileSync(join(OUT, 'sphere-rings-back.svg'), sphereRingsBack());
writeFileSync(join(OUT, 'sphere-globe.svg'), sphereGlobe());
writeFileSync(join(OUT, 'sphere-rings-front.svg'), sphereRingsFront());
writeFileSync(join(UI_OUT, 'astral-frame.svg'), astralFrame());
console.log(`Celestial art written to ${OUT} and ${UI_OUT}`);
