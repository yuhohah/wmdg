import { describe, expect, it } from 'vitest';
import { initialAchievements } from './achievements.js';
import { GNOSE_BOSSES } from './bosses.js';
import { CARD_TUTORIALS } from './cardTutorials.js';
import { GNOSE_UPGRADES } from './gnose.js';
import { initialRelicUpgrades } from './relics.js';

// Below 1e15 the game writes numbers in Brazilian format (20, 1,5K, 2,5M); only larger ones use e-notation.
const SMALL_E_NOTATION = /\d(?:[.,]\d+)?e(?:1[0-4]|\d)(?!\d)/;

describe('player-facing catalogue texts', () => {
  it('never write numbers below 1e15 in scientific notation', () => {
    const stats = { clicks: 0, followers: 0, totalFaith: 0, fps: 0, totalGnoseEarned: 0 } as never;
    const texts = [
      ...initialAchievements.flatMap(a => [a.desc, a.buffText ?? '', a.getProgress?.(stats).label ?? '']),
      ...GNOSE_BOSSES.map(b => b.rewardDesc),
      ...CARD_TUTORIALS.flatMap(t => [t.lore, t.basics]),
      ...GNOSE_UPGRADES.map(u => u.effectText),
      ...initialRelicUpgrades.flatMap(r => [r.effectText(0, 0), r.effectText(r.maxLevel, 0)]),
    ];
    expect(texts.filter(text => SMALL_E_NOTATION.test(text))).toEqual([]);
  });
});
