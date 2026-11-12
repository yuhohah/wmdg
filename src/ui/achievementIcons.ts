import { initialAchievements } from '../config/achievements.js';

const BASE = import.meta.env.BASE_URL;
const BOSSES: Record<string, { file: string; crop: string }> = {
  ach_boss_anubis: { file: '01-anubis', crop: '72 5 52 62' },
  ach_boss_cronos: { file: '02-hades-gow-v2', crop: '69 4 58 62' },
  ach_boss_odin: { file: '03-odin', crop: '76 23 52 52' },
  ach_boss_tiamat: { file: '04-caos-primordial', crop: '50 30 94 70' },
};

const circle = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
const path = (d: string) => `<path d="${d}"/>`;
const person = (x: number, y: number) => circle(x, y, 2) + path(`M${x - 3} ${y + 8}v-2a3 3 0 0 1 6 0v2`);
function rays(count: number, inner: number, outer: number): string {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return path(`M${16 + Math.cos(angle) * inner} ${16 + Math.sin(angle) * inner}L${16 + Math.cos(angle) * outer} ${16 + Math.sin(angle) * outer}`);
  }).join('');
}

/** One visual language per family, with details added in milestone order. */
export function achievementIcon(id: string): string {
  const boss = BOSSES[id];
  if (boss) return `<svg class="achievement-icon achievement-boss-face" viewBox="${boss.crop}" aria-hidden="true" focusable="false"><image href="${BASE}assets/concepts/bosses/${boss.file}.png" width="192" height="192"/></svg>`;

  const family = ['ach_click_', 'ach_f_', 'ach_faith_', 'ach_fps_', 'ach_gnose_'].find(prefix => id.startsWith(prefix));
  if (!family) return '';
  const rank = initialAchievements.filter(ach => ach.id.startsWith(family)).findIndex(ach => ach.id === id) + 1;
  let drawing = '';
  if (family === 'ach_click_') {
    drawing = circle(16, 16, 6);
    if (rank >= 2) drawing += '<ellipse cx="16" cy="16" rx="2.5" ry="6"/>';
    if (rank >= 3) drawing += path('M10 16h12');
    if (rank >= 4) drawing += '<ellipse cx="16" cy="16" rx="11" ry="4" transform="rotate(-35 16 16)"/>';
    if (rank >= 5) drawing += '<ellipse cx="16" cy="16" rx="11" ry="4" transform="rotate(35 16 16)"/>';
    if (rank >= 6) drawing += circle(16, 16, 12);
    if (rank >= 7) drawing += rays(8, 13, 15);
  } else if (family === 'ach_f_') {
    drawing = person(16, 13);
    if (rank >= 2) drawing += person(7, 15);
    if (rank >= 3) drawing += person(25, 15);
    if (rank >= 4) drawing += person(11, 5);
    if (rank >= 5) drawing += person(21, 5);
    if (rank >= 6) drawing += path('M3 26h26');
    if (rank >= 7) drawing += path('M2 9V3h5M25 3h5v6M2 24v5h5M25 29h5v-5');
  } else if (family === 'ach_faith_') {
    drawing = path('M16 10l4 6-4 6-4-6Z');
    if (rank >= 2) drawing += circle(16, 16, 9);
    if (rank >= 3) drawing += path('M16 3v3M16 26v3');
    if (rank >= 4) drawing += path('M3 16h3M26 16h3');
    if (rank >= 5) drawing += path('M7 7l2 2M23 23l2 2M7 25l2-2M23 9l2-2');
    if (rank >= 6) drawing += circle(16, 16, 13);
    if (rank >= 7) drawing += rays(8, 14, 15.5);
  } else if (family === 'ach_fps_') {
    drawing = circle(16, 16, 2);
    if (rank >= 2) drawing += circle(16, 16, 10);
    if (rank >= 3) drawing += path('M16 6v2M16 24v2');
    if (rank >= 4) drawing += path('M6 16h2M24 16h2');
    if (rank >= 5) drawing += path('M9 9l1 1M22 22l1 1M9 23l1-1M22 10l1-1');
    if (rank >= 6) drawing += path('M5 9 3 6v7h5M27 23l2 3v-7h-5');
    if (rank >= 7) drawing += circle(16, 16, 15);
  } else {
    drawing = path('M5 16q11-12 22 0-11 12-22 0Z') + circle(16, 16, 3);
    if (rank >= 2) drawing += path('M16 3 30 27H2Z');
    if (rank >= 3) drawing += circle(16, 16, 15);
    if (rank >= 4) drawing += path('M16 1v6M16 25v6M1 16h5M26 16h5M5 5l4 4M23 23l4 4M5 27l4-4M23 9l4-4');
  }
  return `<svg class="achievement-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${drawing}</svg>`;
}
