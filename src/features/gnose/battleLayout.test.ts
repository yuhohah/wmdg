import { describe, expect, it } from 'vitest';
import { bossHpLabel, keepClearOfPlate } from './BossBattleModal.js';

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
  const plate = { centerX: 100, top: 200 };

  it('moves a card off the health plate, toward the Sphere', () => {
    expect(keepClearOfPlate({ x: 150, y: 220 }, plate, 500, 1)).toEqual({ x: 299, y: 220 });
    expect(keepClearOfPlate({ x: 150, y: 220 }, plate, -500, 1)).toEqual({ x: -99, y: 220 });
  });

  it('accounts for the zoom scale of both elements', () => {
    expect(keepClearOfPlate({ x: 150, y: 220 }, plate, 500, 2)).toEqual({ x: 490, y: 220 });
  });

  it('lifts cards of multi-card attacks instead of pushing them onto each other', () => {
    expect(keepClearOfPlate({ x: 150, y: 220 }, plate, 500, 1, true)).toEqual({ x: 150, y: 132 });
    expect(keepClearOfPlate({ x: 150, y: 220 }, plate, 500, 2, true)).toEqual({ x: 150, y: 72 });
    expect(keepClearOfPlate({ x: 400, y: 220 }, plate, 500, 1, true)).toEqual({ x: 400, y: 220 });
  });

  it('leaves cards that do not touch the plate where they are', () => {
    expect(keepClearOfPlate({ x: 400, y: 220 }, plate, 500, 1)).toEqual({ x: 400, y: 220 });
    expect(keepClearOfPlate({ x: 150, y: 100 }, plate, 500, 1)).toEqual({ x: 150, y: 100 });
    expect(keepClearOfPlate({ x: 150, y: 400 }, plate, 500, 1)).toEqual({ x: 150, y: 400 });
  });
});
