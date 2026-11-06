import { describe, expect, it } from 'vitest';
import { bossHpLabel, parryCardPosition, stepDamageTrail } from './BossBattleModal.js';

describe('Guardian health label', () => {
  it('shows the phase, the rounded health and the passive victory time', () => {
    expect(bossHpLabel(1, 96.9, 54)).toBe('Fase I · 97% · ~54s');
    expect(bossHpLabel(3, 50, 10)).toBe('Fase III · 50% · ~10s');
  });

  it('never rounds a living Guardian down to 0%', () => {
    expect(bossHpLabel(2, 0.4, 5)).toBe('Fase II · 1% · ~5s');
  });

  it('omits the time when there is no passive damage', () => {
    expect(bossHpLabel(1, 100, Infinity)).toBe('Fase I · 100%');
  });
});

describe('parry card placement', () => {
  const sphere = { x: 1000, y: 1000 };
  // World-space boxes relative to the Sphere, for a Guardian at its combat spot
  const guardian = { left: -400, right: -250, top: -200, bottom: 40 };
  const healthPlate = (scale: number) => ({ left: -128 * scale, right: 128 * scale, top: 206, bottom: 206 + 110 * scale });
  const SCALES = [1, 1.5, 1.8, 2.4];

  function cardBox(pos: { x: number; y: number }, scale: number) {
    return {
      left: pos.x - sphere.x - 69 * scale,
      right: pos.x - sphere.x + 69 * scale,
      top: pos.y - sphere.y - 60 * scale,
      bottom: pos.y - sphere.y + 60 * scale,
    };
  }
  type Box = ReturnType<typeof cardBox>;
  const overlap = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

  const standard = (angleDeg: number) => ({
    kind: 'standard' as const,
    slotIndex: 0,
    xPercent: 50 + Math.cos((angleDeg * Math.PI) / 180) * 30,
    yPercent: 50 + Math.sin((angleDeg * Math.PI) / 180) * 30,
  });
  const rifts = [
    ...Array.from({ length: 36 }, (_, i) => standard(i * 10 - 180)),
    { kind: 'anubis_scales' as const, slotIndex: 0, xPercent: 22, yPercent: 50 },
    { kind: 'anubis_scales' as const, slotIndex: 1, xPercent: 78, yPercent: 50 },
    { kind: 'hades_chains' as const, slotIndex: 0, xPercent: 32, yPercent: 34 },
    { kind: 'hades_chains' as const, slotIndex: 1, xPercent: 68, yPercent: 66 },
    { kind: 'odin_raven' as const, slotIndex: 0, xPercent: 46, yPercent: 26 },
    { kind: 'chaos_orbit' as const, slotIndex: 0, xPercent: 50, yPercent: 18 },
    { kind: 'chaos_orbit' as const, slotIndex: 1, xPercent: 22, yPercent: 72 },
    { kind: 'chaos_orbit' as const, slotIndex: 2, xPercent: 78, yPercent: 72 },
  ];

  it.each(SCALES)('keeps every card off the Guardian and the Sphere health plate at scale %d', scale => {
    for (const rift of rifts) {
      for (const elapsed of [0, 1, 3, 7]) {
        const box = cardBox(parryCardPosition(rift, sphere, elapsed, scale), scale);
        expect(overlap(box, guardian)).toBe(false);
        expect(overlap(box, healthPlate(scale))).toBe(false);
      }
    }
  });

  it.each(SCALES)('keeps every card clear of the Sphere itself at scale %d', scale => {
    for (const rift of rifts) {
      const box = cardBox(parryCardPosition(rift, sphere, 0, scale), scale);
      // Distance from the Sphere's centre to the nearest point of the card
      const nearestX = Math.max(box.left, Math.min(0, box.right));
      const nearestY = Math.max(box.top, Math.min(0, box.bottom));
      expect(Math.hypot(nearestX, nearestY)).toBeGreaterThanOrEqual(130);
    }
  });

  it.each(['anubis_scales', 'hades_chains', 'chaos_orbit'] as const)('never stacks the cards of %s', kind => {
    for (const scale of SCALES) {
      const cards = [0, 1, 2]
        .filter(slot => kind === 'chaos_orbit' || slot < 2)
        .map(slotIndex => cardBox(parryCardPosition({ kind, slotIndex, xPercent: 50, yPercent: 50 }, sphere, 2, scale), scale));
      for (let a = 0; a < cards.length; a++) {
        for (let b = a + 1; b < cards.length; b++) expect(overlap(cards[a], cards[b])).toBe(false);
      }
    }
  });

  it('spreads standard cards along the arc', () => {
    const positions = [-170, -60, 60, 170].map(angle => parryCardPosition(standard(angle), sphere, 0, 1));
    expect(new Set(positions.map(p => `${p.x},${p.y}`)).size).toBe(4);
  });
});

describe('damage trail', () => {
  it('holds still right after a hit', () => {
    expect(stepDamageTrail({ value: 80, holdSec: 0.35 }, 70, 0.1).value).toBe(80);
  });

  it('then shrinks gradually toward the current health', () => {
    const next = stepDamageTrail({ value: 80, holdSec: 0 }, 70, 0.1);
    expect(next.value).toBeCloseTo(76);
  });

  it('stops at the current health and re-arms the pause', () => {
    expect(stepDamageTrail({ value: 71, holdSec: 0 }, 70, 0.1)).toEqual({ value: 70, holdSec: 0.35 });
  });

  it('follows healing immediately', () => {
    expect(stepDamageTrail({ value: 50, holdSec: 0 }, 60, 0.1)).toEqual({ value: 60, holdSec: 0.35 });
  });

  it('keeps shrinking under rapid hits instead of freezing', () => {
    let trail = { value: 100, holdSec: 0.35 };
    let health = 100;
    for (let i = 0; i < 40; i++) {
      health -= 0.5;
      trail = stepDamageTrail(trail, health, 0.05);
    }
    expect(trail.value).toBeLessThan(100);
    expect(trail.value).toBeGreaterThanOrEqual(health);
  });
});
