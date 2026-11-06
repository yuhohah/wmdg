import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GNOSE_BOSSES } from '../../config/bosses.js';
import { BossBattleModal } from './BossBattleModal.js';

describe('battle result popup', () => {
  const showCustomPopup = vi.fn();
  const boss = GNOSE_BOSSES[0];
  const pillars = [
    { id: 'faith', label: 'Fé', readiness: 0.4 },
    { id: 'followers', label: 'Fiéis', readiness: 0.5 },
  ];

  function present(result: { victory: boolean; isRematch: boolean }) {
    const modal = Object.assign(Object.create(BossBattleModal.prototype), {
      options: {
        audio: { playChime: vi.fn(), playTone: vi.fn() },
        notifications: { showCustomPopup },
        gameState: { getBossBestTimeSec: () => 40 },
      },
    });
    modal.presentBattleResultPopup({ boss, durationSec: 42.14, cultReadiness: 0.72, lowestTwoPillars: pillars, ...result });
    const [title, desc] = showCustomPopup.mock.calls[0];
    return { title: title as string, desc: desc as string };
  }

  beforeEach(() => showCustomPopup.mockClear());

  it('explains a defeat in text short enough to read before it closes', () => {
    const { title, desc } = present({ victory: false, isRematch: false });
    expect(desc).toContain('-25%');
    expect(desc).toContain('72%');
    expect(desc).toContain('Fé e Fiéis');
    expect((title + desc).length).toBeLessThanOrEqual(133);
  });

  it('does not mention the curse on a lost rematch', () => {
    const { desc } = present({ victory: false, isRematch: true });
    expect(desc).not.toContain('-25%');
    expect(desc).toContain('Fé e Fiéis');
  });

  it('does not promise the reward again on a won rematch', () => {
    const { desc } = present({ victory: true, isRematch: true });
    expect(desc).toContain('42.1s');
    expect(desc).toContain('40.0s');
    expect(desc).not.toContain(boss.rewardName);
  });

  it('announces the reward on a first victory', () => {
    const { desc } = present({ victory: true, isRematch: false });
    expect(desc).toContain(boss.rewardName);
  });
});
