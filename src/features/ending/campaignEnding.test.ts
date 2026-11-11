import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import { INCARNATION_STAGES } from '../../config/incarnation.js';
import { CampaignEnding } from './CampaignEnding.js';
import { GNOSE_BOSSES } from '../../config/bosses.js';

const finalStage = INCARNATION_STAGES.at(-1)!.stage;
const finalBoss = GNOSE_BOSSES.find(boss => boss.unlocksTier === 'endgame')!.id;

describe('campaign conclusion', () => {
  it('requires both the purchased final incarnation and the final guardian victory, in either order', () => {
    const gs = new GameStateManager();
    expect(gs.isCampaignComplete()).toBe(false);
    gs.incarnationStage = finalStage;
    expect(gs.isCampaignComplete()).toBe(false);
    gs.defeatedBosses.add(finalBoss);
    expect(gs.isCampaignComplete()).toBe(true);
    gs.incarnationStage = finalStage - 1;
    expect(gs.isCampaignComplete()).toBe(false);
    gs.incarnationStage = finalStage;
    expect(gs.isCampaignComplete()).toBe(true);
  });

  it('restores completion and free play choices, while old saves remain eligible for the tribute', () => {
    const gs = new GameStateManager();
    for (const choice of ['completed', 'freeplay'] as const) {
      gs.campaignEnding = choice;
      const restored = new GameStateManager();
      restored.applySaveData(gs.buildSaveData());
      expect(restored.campaignEnding).toBe(choice);
    }
    const legacy = gs.buildSaveData();
    delete legacy.stats.campaignEnding;
    gs.applySaveData(legacy);
    expect(gs.campaignEnding).toBe('pending');
  });

  it('preserves the ending choice across ascensions and clears it for a fresh game', () => {
    const gs = new GameStateManager();
    gs.campaignEnding = 'freeplay';
    gs.totalFaithAccumulated = 1e50;
    gs.faithPoints = 1e50;
    gs.unlocks.find(unlock => unlock.id === 'unlock_gnose')!.unlocked = true;
    const result = gs.performGnoseReset();
    expect(result.success).toBe(true);
    expect(gs.campaignEnding).toBe('freeplay');
    gs.resetToDefaults();
    expect(gs.campaignEnding).toBe('pending');
  });
});


describe('ending presentation', () => {
  afterEach(() => vi.unstubAllGlobals());

  function setup() {
    const gs = new GameStateManager();
    gs.incarnationStage = finalStage;
    gs.defeatedBosses.add(finalBoss);
    const open = vi.fn();
    const canPresent = vi.fn(() => true);
    const querySelector = vi.fn(() => null);
    vi.stubGlobal('document', { querySelector });
    const ending = Object.assign(Object.create(CampaignEnding.prototype), {
      gs, open, canPresent, launcher: { hidden: true },
    });
    return { gs, ending, open, canPresent, querySelector };
  }

  it('automatically opens an eligible ending and waits for battle choreography or the start screen', () => {
    const { ending, open, canPresent } = setup();
    canPresent.mockReturnValue(false);
    ending.update();
    expect(open).not.toHaveBeenCalled();
    canPresent.mockReturnValue(true);
    ending.update();
    expect(open).toHaveBeenCalledWith(true);
  });

  it('waits for other dialogs and avoids opening duplicate endings', () => {
    const { ending, open, querySelector } = setup();
    querySelector.mockReturnValueOnce(Object.create(null));
    ending.update();
    expect(open).not.toHaveBeenCalled();
    ending.dialog = {};
    ending.update();
    expect(open).not.toHaveBeenCalled();
  });

  it('does not interrupt completed games, keeping the leaderboard accessible after an ascension', () => {
    const { gs, ending, open } = setup();
    for (const choice of ['completed', 'freeplay'] as const) {
      gs.campaignEnding = choice;
      gs.incarnationStage = 1;
      ending.update();
      expect(open).not.toHaveBeenCalled();
      expect(ending.launcher.hidden).toBe(false);
    }
  });
});
