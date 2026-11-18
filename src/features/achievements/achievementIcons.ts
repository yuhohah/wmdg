import { initialAchievements } from '../../config/achievements.js';

const BASE = import.meta.env.BASE_URL;

interface BossPortraitSpec {
  path: string;
  crop: readonly [number, number, number];
  cursed: boolean;
  emblem: 'scales' | 'chains' | 'rune' | 'chaos' | 'demiurge';
}

const BOSS_PORTRAITS: Record<string, BossPortraitSpec> = {
  ach_boss_anubis: {
    path: 'concepts/bosses/01-anubis.png',
    crop: [66, 6, 60],
    cursed: false,
    emblem: 'scales',
  },
  ach_boss_cronos: {
    path: 'concepts/bosses/02-hades-gow-v2.png',
    crop: [67, 4, 60],
    cursed: false,
    emblem: 'chains',
  },
  ach_boss_odin: {
    path: 'concepts/bosses/03-odin.png',
    crop: [76, 22, 52],
    cursed: false,
    emblem: 'rune',
  },
  ach_boss_tiamat: {
    path: 'concepts/bosses/04-caos-primordial.png',
    crop: [55, 22, 84],
    cursed: false,
    emblem: 'chaos',
  },
  ach_curse_cronos: {
    path: 'concepts/bosses/02-hades-gow-v2.png',
    crop: [67, 4, 60],
    cursed: true,
    emblem: 'chains',
  },
  ach_curse_odin: {
    path: 'concepts/bosses/03-odin.png',
    crop: [76, 22, 52],
    cursed: true,
    emblem: 'rune',
  },
  ach_curse_tiamat: {
    path: 'concepts/bosses/04-caos-primordial.png',
    crop: [55, 22, 84],
    cursed: true,
    emblem: 'chaos',
  },
  ach_curse_demiurge: {
    path: 'concepts/demiurgo/02-demiurgo-yaldabaoth.png',
    crop: [64, 12, 64],
    cursed: true,
    emblem: 'demiurge',
  },
};

let nextMedallionClipId = 0;

const fmt = (n: number) => Number(n.toFixed(2));

function radialTicks(count: number, inner: number, outer: number, phaseRad = -Math.PI / 2, cls = ''): string {
  const attr = cls ? ` class="${cls}"` : '';
  const d = Array.from({ length: count }, (_, i) => {
    const a = phaseRad + (i / count) * Math.PI * 2;
    return `M${fmt(24 + Math.cos(a) * inner)} ${fmt(24 + Math.sin(a) * inner)}L${fmt(24 + Math.cos(a) * outer)} ${fmt(24 + Math.sin(a) * outer)}`;
  }).join('');
  return `<path${attr} d="${d}"/>`;
}

function star4(cx: number, cy: number, rOuter: number, rInner = rOuter * 0.32, filled = false): string {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const r = i % 2 === 0 ? rOuter : rInner;
    pts.push(`${i === 0 ? 'M' : 'L'}${fmt(cx + Math.cos(a) * r)} ${fmt(cy + Math.sin(a) * r)}`);
  }
  return `<path d="${pts.join('')}Z"${filled ? ' fill="currentColor" fill-opacity="0.28"' : ''}/>`;
}

function hoodedCultist(cx: number, cy: number, s = 1): string {
  const w = 4.2 * s;
  const h = 9.5 * s;
  const top = fmt(cy - h * 0.58);
  const shoulderY = fmt(cy - h * 0.08);
  const bot = fmt(cy + h * 0.52);
  return (
    `<path fill="currentColor" fill-opacity="0.16" d="M${fmt(cx)} ${top}L${fmt(cx - w * 0.62)} ${shoulderY}L${fmt(cx - w)} ${bot}H${fmt(cx + w)}L${fmt(cx + w * 0.62)} ${shoulderY}Z"/>` +
    `<path class="ach-stroke-thin" d="M${fmt(cx)} ${fmt(cy - h * 0.22)}v${fmt(h * 0.68)}"/>`
  );
}

function sealBorder(rank: number): string {
  let out = '';
  if (rank === 1) {
    out += '<path class="ach-stroke-thin" d="M7 14V7h7M34 7h7v7M7 34v7h7M34 41h7v-7"/>';
  } else if (rank === 2) {
    out += '<path class="ach-stroke-thin" d="M11 9.5A19.5 19.5 0 0 1 37 9.5M37 38.5A19.5 19.5 0 0 1 11 38.5"/>';
    out += '<circle cx="24" cy="6.2" r="1.1" fill="currentColor"/><circle cx="24" cy="41.8" r="1.1" fill="currentColor"/>';
  } else if (rank === 3) {
    out += '<circle class="ach-stroke-thin" cx="24" cy="24" r="20.2"/>';
  } else if (rank === 4) {
    out += '<circle class="ach-stroke-thin" cx="24" cy="24" r="20.2"/>';
    out += radialTicks(4, 18.4, 22, -Math.PI / 2, 'ach-stroke-accent');
  } else if (rank === 5) {
    out += '<circle cx="24" cy="24" r="19.6"/><circle class="ach-stroke-thin" cx="24" cy="24" r="22"/>';
    out += radialTicks(8, 19.6, 22, -Math.PI / 2, 'ach-stroke-thin');
  } else if (rank === 6) {
    out += '<circle class="ach-stroke-accent" cx="24" cy="24" r="19.4"/><circle class="ach-stroke-thin" cx="24" cy="24" r="22"/>';
    out += radialTicks(12, 19.4, 22, -Math.PI / 2, 'ach-stroke-thin');
  } else if (rank >= 7) {
    out += '<circle class="ach-stroke-accent" cx="24" cy="24" r="18.8"/><circle cx="24" cy="24" r="21.4"/>';
    out += radialTicks(16, 21.4, 23.4, -Math.PI / 2, 'ach-stroke-accent');
    out += '<circle cx="24" cy="2.6" r="1.3" fill="currentColor"/><circle cx="24" cy="45.4" r="1.3" fill="currentColor"/><circle cx="2.6" cy="24" r="1.3" fill="currentColor"/><circle cx="45.4" cy="24" r="1.3" fill="currentColor"/>';
  }
  return out;
}

function renderBossMedallion(spec: BossPortraitSpec): string {
  const cls = spec.cursed
    ? 'achievement-icon achievement-boss-medallion achievement-cursed-medallion'
    : 'achievement-icon achievement-boss-medallion';
  const clipId = `ach-medallion-clip-${++nextMedallionClipId}`;
  const [cropX, cropY, cropSize] = spec.crop;
  const boxMin = 8.4;
  const boxSize = 31.2;
  const scale = boxSize / cropSize;
  const imgX = fmt(boxMin - cropX * scale);
  const imgY = fmt(boxMin - cropY * scale);
  const imgSize = fmt(192 * scale);

  let frame = '';
  if (spec.cursed) {
    // 5 thorned curse spikes representing 5/5 stacks of Maldição dos Guardiões
    const thorns: string[] = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const aL = a - 0.16;
      const aR = a + 0.16;
      thorns.push(
        `M${fmt(24 + Math.cos(aL) * 17.2)} ${fmt(24 + Math.sin(aL) * 17.2)}` +
          `L${fmt(24 + Math.cos(a) * 23.2)} ${fmt(24 + Math.sin(a) * 23.2)}` +
          `L${fmt(24 + Math.cos(aR) * 17.2)} ${fmt(24 + Math.sin(aR) * 17.2)}`
      );
    }
    frame +=
      `<circle class="ach-stroke-curse" cx="24" cy="24" r="19.6" stroke-dasharray="3 2.5"/>` +
      `<circle cx="24" cy="24" r="16.4" stroke-width="1.6"/>` +
      `<path class="ach-stroke-curse" fill="currentColor" fill-opacity="0.22" d="${thorns.join('')}"/>` +
      // Crossed shackle corner links & Roman V cartouche at bottom
      `<path class="ach-stroke-thin" d="M8.5 11.5l3.5 3.5M39.5 11.5l-3.5 3.5M8.5 36.5l3.5-3.5M39.5 36.5l-3.5-3.5"/>` +
      `<path fill="#120d0e" stroke="currentColor" stroke-width="1.2" d="M19.2 37.2h9.6l-1.4 6.2h-6.8Z"/>` +
      `<path class="ach-stroke-curse" stroke-width="1.35" d="M22.1 39l1.9 3.2L25.9 39"/>`;
  } else {
    frame +=
      `<circle class="ach-stroke-thin" cx="24" cy="24" r="20.4"/>` +
      `<circle class="ach-stroke-accent" cx="24" cy="24" r="16.4" stroke-width="1.5"/>` +
      radialTicks(8, 16.6, 20.2, -Math.PI / 2, 'ach-stroke-thin');

    if (spec.emblem === 'scales') {
      frame += '<path class="ach-stroke-accent" d="M18 6.5h12M24 4.2v4.2M18 6.5l-1.6 2.8h3.2ZM30 6.5l-1.6 2.8h3.2Z"/>';
    } else if (spec.emblem === 'chains') {
      frame += '<path class="ach-stroke-accent" d="M20 5.5l4 3.5 4-3.5M21.5 41.8h5"/>';
    } else if (spec.emblem === 'rune') {
      frame += '<path class="ach-stroke-accent" d="M24 3.6l2.6 3.6-2.6 2.6-2.6-2.6Z"/>';
    } else if (spec.emblem === 'chaos') {
      frame += star4(24, 6.2, 3.4, 1.2, true);
    }
  }

  return (
    `<svg class="${cls}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">` +
    `<defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><circle cx="24" cy="24" r="15.6"/></clipPath></defs>` +
    `<g clip-path="url(#${clipId})">` +
    `<circle cx="24" cy="24" r="16" fill="#0d0e13"/>` +
    `<image class="achievement-boss-face" href="${BASE}assets/${spec.path}" x="${imgX}" y="${imgY}" width="${imgSize}" height="${imgSize}"/>` +
    `</g>` +
    frame +
    `</svg>`
  );
}

/** Hermetic copperplate engraving iconography for all 7 achievement families. */
export function achievementIcon(id: string): string {
  const portrait = BOSS_PORTRAITS[id];
  if (portrait) return renderBossMedallion(portrait);

  const family = ['ach_click_', 'ach_f_', 'ach_faith_', 'ach_fps_', 'ach_gnose_'].find((prefix) =>
    id.startsWith(prefix)
  );
  if (!family) return '';

  const rank =
    initialAchievements.filter((ach) => ach.id.startsWith(family)).findIndex((ach) => ach.id === id) + 1;
  let drawing = '';

  if (family === 'ach_click_') {
    // Armillary Sphere & Divine Pulse
    drawing += sealBorder(rank);
    drawing += '<circle cx="24" cy="24" r="6.6" fill="currentColor" fill-opacity="0.15"/>';
    drawing += '<path class="ach-stroke-thin" d="M21.5 18.2A6.2 6.2 0 0 0 21.5 29.8"/>';
    drawing += '<circle cx="24" cy="24" r="1.9" fill="currentColor"/>';
    drawing += '<path class="ach-stroke-accent" d="M16.5 13.5A12.5 12.5 0 0 1 31.5 13.5"/>';
    if (rank >= 2) {
      drawing += '<ellipse class="ach-stroke-thin" cx="24" cy="24" rx="3.1" ry="6.6"/>';
      drawing += '<path class="ach-stroke-thin" d="M17.4 24h13.2M31.5 34.5A12.5 12.5 0 0 1 16.5 34.5"/>';
    }
    if (rank >= 3) {
      drawing += '<path class="ach-stroke-accent" d="M24 9.5v4.2M24 34.3v4.2M9.5 24h4.2M34.3 24h4.2"/>';
    }
    if (rank >= 4) {
      drawing += '<ellipse cx="24" cy="24" rx="15" ry="5.2" transform="rotate(-32 24 24)"/>';
      drawing += '<circle cx="36.2" cy="16.4" r="1.5" fill="currentColor"/>';
    }
    if (rank >= 5) {
      drawing += '<ellipse class="ach-stroke-accent" cx="24" cy="24" rx="15" ry="5.2" transform="rotate(32 24 24)"/>';
      drawing += '<circle cx="11.8" cy="16.4" r="1.5" fill="currentColor"/>';
    }
    if (rank >= 6) {
      drawing += radialTicks(8, 12.2, 15.8, Math.PI / 8, 'ach-stroke-thin');
    }
    if (rank >= 7) {
      drawing += star4(24, 24, 10.5, 2.6, true);
    }
  } else if (family === 'ach_f_') {
    // Cowled Monastic Congregation & Cathedral Sanctuary
    drawing += sealBorder(rank);
    if (rank >= 3) {
      drawing += '<path class="ach-stroke-thin" d="M10.5 35.5V22.5Q10.5 11.5 24 8.5Q37.5 11.5 37.5 22.5v13"/>';
    }
    if (rank >= 4) {
      drawing += hoodedCultist(18.5, 22.5, 0.78) + hoodedCultist(29.5, 22.5, 0.78);
    }
    if (rank >= 2) {
      drawing += hoodedCultist(14.5, 29.2, 0.86) + hoodedCultist(33.5, 29.2, 0.86);
    }
    drawing += hoodedCultist(24, 28.2, 1.04);
    drawing += star4(24, rank >= 4 ? 13.2 : 14.5, rank >= 5 ? 4.2 : 3.2, 1.2, true);
    if (rank >= 5) {
      drawing += '<circle class="ach-stroke-accent" cx="24" cy="13.2" r="5.6"/>';
      drawing += '<path d="M9.5 35.8h29"/>';
    }
    if (rank >= 6) {
      drawing += '<path class="ach-stroke-thin" d="M12.5 38.2h23M10 19.5l2.5-2.5M38 19.5L35.5 17"/>';
    }
    if (rank >= 7) {
      drawing += '<path class="ach-stroke-accent" d="M24 5.5v2.2M17.5 9.2l1.6 1.6M30.5 9.2l-1.6 1.6M15.5 14.2h2.2M30.3 14.2h2.2"/>';
    }
  } else if (family === 'ach_faith_') {
    // Alchemical Chalice, Reliquary & Cosmic Monstrance
    drawing += sealBorder(rank);
    drawing +=
      '<path fill="currentColor" fill-opacity="0.16" d="M16.8 22.5Q16.8 30.2 24 30.2Q31.2 30.2 31.2 22.5Z"/>' +
      '<path d="M24 30.2v6.6M18.6 36.8h10.8M21.2 33.4h5.6"/>';
    drawing += star4(24, 15.6, 4.4, 1.4, true);
    if (rank >= 2) {
      drawing += '<path class="ach-stroke-thin" d="M19.5 20.6Q17.5 16 20.2 12.2M28.5 20.6Q30.5 16 27.8 12.2"/>';
      drawing += '<path class="ach-stroke-accent" d="M14.5 23.2A9.8 9.8 0 0 0 33.5 23.2"/>';
    }
    if (rank >= 3) {
      drawing += '<circle class="ach-stroke-accent" cx="24" cy="15.6" r="6.4"/>';
    }
    if (rank >= 4) {
      drawing += '<path class="ach-stroke-thin" d="M24 7v2.4M14 15.6h2.4M31.6 15.6H34M17.2 9.4l1.8 1.8M30.8 9.4L29 11.2"/>';
    }
    if (rank >= 5) {
      drawing += '<circle class="ach-stroke-thin" cx="24" cy="16.2" r="10.2" stroke-dasharray="2.5 2.5"/>';
    }
    if (rank >= 6) {
      drawing += '<circle cx="13.2" cy="13.2" r="1.1" fill="currentColor"/><circle cx="34.8" cy="13.2" r="1.1" fill="currentColor"/>';
    }
    if (rank >= 7) {
      // Lemniscate of Infinity at the foot of the Monstrance
      drawing +=
        '<path class="ach-stroke-accent" d="M18.5 39.2c-2.6 0-2.6-3.4 0-3.4 2.4 0 8.6 3.4 11 3.4 2.6 0 2.6-3.4 0-3.4-2.4 0-8.6 3.4-11 3.4Z"/>';
    }
  } else if (family === 'ach_fps_') {
    // Hermetic Clepsydra (Hourglass) & Perpetual Astral Horologium
    drawing += sealBorder(rank);
    drawing +=
      '<path d="M17.2 13.5h13.6M17.2 34.5h13.6"/>' +
      '<path fill="currentColor" fill-opacity="0.15" d="M18.6 13.5L24 23.6L29.4 13.5ZM18.6 34.5L24 24.4L29.4 34.5Z"/>' +
      '<path class="ach-stroke-accent" d="M24 21v8.5"/>' +
      '<path fill="currentColor" fill-opacity="0.35" d="M20.4 34.2L24 30.8l3.6 3.4Z"/>';
    if (rank >= 2) {
      drawing += '<path class="ach-stroke-thin" d="M16.8 13.5v21M31.2 13.5v21"/>';
    }
    if (rank >= 3) {
      drawing += '<circle class="ach-stroke-thin" cx="24" cy="24" r="15.2"/>';
      drawing += '<path class="ach-stroke-accent" d="M24 8.8v2.4M24 36.8v2.4M8.8 24h2.4M36.8 24h2.4"/>';
    }
    if (rank >= 4) {
      drawing += '<path class="ach-stroke-thin" d="M11.8 15.2l-1.2-3.4 3.5.8M36.2 32.8l1.2 3.4-3.5-.8"/>';
    }
    if (rank >= 5) {
      // Engraved astral wings flanking the Clepsydra
      drawing += '<path class="ach-stroke-accent" d="M16.5 20.5Q10.5 18 9.8 23.5Q12 26.5 16.5 27.5M31.5 20.5Q37.5 18 38.2 23.5Q36 26.5 31.5 27.5"/>';
    }
    if (rank >= 6) {
      drawing += radialTicks(12, 15.2, 17.6, -Math.PI / 2, 'ach-stroke-thin');
    }
    if (rank >= 7) {
      drawing += star4(24, 24, 6.2, 1.8, true);
    }
  } else {
    // Gnose: The Eye of Nous, Alchemical Triangle, Hexagram & Squared Circle
    const gnoseBorderRank = [2, 4, 6, 7][Math.max(0, Math.min(3, rank - 1))];
    drawing += sealBorder(gnoseBorderRank);

    if (rank >= 4) {
      // Inscribed Square of the Philosopher's Stone
      drawing += '<rect class="ach-stroke-thin" x="10.6" y="10.6" width="26.8" height="26.8" transform="rotate(45 24 24)"/>';
    }
    if (rank >= 2) {
      drawing += '<path class="ach-stroke-accent" d="M24 6.8L39.5 34.2H8.5Z"/>';
    }
    if (rank >= 3) {
      drawing += '<path class="ach-stroke-thin" d="M24 41.2L39.5 13.8H8.5Z"/>';
    }

    // Eye of Nous centerpiece
    drawing +=
      '<path fill="#0d0e13" fill-opacity="0.82" d="M11.2 24Q24 14.2 36.8 24Q24 33.8 11.2 24Z"/>' +
      '<circle class="ach-stroke-accent" cx="24" cy="24" r="4.8" fill="currentColor" fill-opacity="0.18"/>' +
      '<circle cx="24" cy="24" r="2" fill="currentColor"/>' +
      '<path class="ach-stroke-thin" d="M16 17.2l1.4 2M24 15v2.4M32 17.2l-1.4 2"/>';
  }

  return (
    `<svg class="achievement-icon achievement-engraving" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">` +
    drawing +
    `</svg>`
  );
}
