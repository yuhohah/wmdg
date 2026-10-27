import { describe, it, expect, vi } from 'vitest';
import { GameStateManager } from './GameState.js';

describe('GameStateManager core logic', () => {
  it('initializes with default values', () => {
    const gs = new GameStateManager();
    expect(gs.faithPoints).toBe(1);
    expect(gs.totalClicks).toBe(0);
    expect(gs.fervorPoints).toBe(0);
    expect(gs.relicPoints).toBe(0);
    expect(gs.gnosePoints).toBe(0);
    expect(gs.getTotalFollowersCount()).toBe(0);
  });

  it('addClick increases clicks, adds faith, and supports critical clicks', () => {
    const gs = new GameStateManager();
    const baseFpc = gs.getFaithPerClick();

    // Mock Math.random to test non-critical click
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const normal = gs.addClick();
    expect(normal.isCrit).toBe(false);
    expect(normal.fpc).toBe(baseFpc);
    expect(gs.totalClicks).toBe(1);

    // Mock Math.random to test critical click (< 0.05)
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const crit = gs.addClick();
    expect(crit.isCrit).toBe(true);
    expect(crit.fpc).toBe(baseFpc * 2);
    expect(gs.totalClicks).toBe(2);

    vi.restoreAllMocks();
  });

  it('purchases devotees and computes item cost properly', () => {
    const gs = new GameStateManager();
    gs.faithPoints = 100;
    const bought = gs.buyOneFollower(0);
    expect(bought).toBe(true);
    expect(gs.followers[0].count).toBe(1);
    expect(gs.faithPoints).toBe(80); // base cost 20
  });

  it('serializes and deserializes save data with high fidelity', () => {
    const gs = new GameStateManager();
    gs.faithPoints = 50000;
    gs.totalClicks = 42;
    gs.fervorPoints = 1200;
    gs.relicPoints = 300;
    gs.followers[0].count = 15;

    const saved = gs.buildSaveData();
    const loaded = new GameStateManager();
    loaded.applySaveData(saved);

    expect(loaded.faithPoints).toBe(50000);
    expect(loaded.totalClicks).toBe(42);
    expect(loaded.fervorPoints).toBe(1200);
    expect(loaded.relicPoints).toBe(0); // relics not unlocked yet
    expect(loaded.followers[0].count).toBe(15);
  });
});
