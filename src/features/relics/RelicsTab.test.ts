import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import type { AudioManager } from '../../systems/audio.js';
import type { NotificationManager } from '../../systems/notifications.js';
import { SaveSystem } from '../../systems/saveSystem.js';
import { RelicsTab } from './RelicsTab.js';

describe('transmutation notification', () => {
  const showCustomPopup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('document', { getElementById: () => null });
    vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 800 });
  });

  afterEach(() => vi.unstubAllGlobals());

  function createTab(gameState: GameStateManager) {
    return new RelicsTab({
      gameState,
      audio: { playChime: vi.fn() } as unknown as AudioManager,
      notifications: { showCustomPopup } as unknown as NotificationManager,
      spawnFloatingText: vi.fn(),
    });
  }

  function transmute(game: GameStateManager, tab: RelicsTab) {
    game.unlocks.find(u => u.id === 'unlock_relics')!.unlocked = true;
    game.faithPoints = 1e15;
    game.relicConvertCooldown = 0;
    tab.convertFaithToRelics();
  }

  it('shows once across repeated transmutations, save reload, and Gnose ascension', () => {
    const game = new GameStateManager();
    const tab = createTab(game);
    transmute(game, tab);
    expect(showCustomPopup).toHaveBeenCalledTimes(1);
    const firstBalance = game.relicPoints;
    transmute(game, tab);
    expect(game.relicPoints).toBeGreaterThan(firstBalance);
    expect(showCustomPopup).toHaveBeenCalledTimes(1);

    const loaded = new GameStateManager();
    loaded.applySaveData(SaveSystem.deserialize(SaveSystem.serialize(game.buildSaveData()))!);
    const loadedTab = createTab(loaded);
    transmute(loaded, loadedTab);
    expect(showCustomPopup).toHaveBeenCalledTimes(1);

    loaded.unlocks.find(u => u.id === 'unlock_gnose')!.unlocked = true;
    loaded.faithPoints = 1e18;
    expect(loaded.performGnoseReset().success).toBe(true);
    transmute(loaded, loadedTab);
    expect(showCustomPopup).toHaveBeenCalledTimes(1);

    loaded.resetToDefaults();
    transmute(loaded, loadedTab);
    expect(showCustomPopup).toHaveBeenCalledTimes(2);
  });

  it('does not consume the notification on failed attempts and accepts older saves', () => {
    const game = new GameStateManager();
    const save = game.buildSaveData();
    delete save.stats.hasSeenTransmutationNotification;
    game.applySaveData(save);
    const tab = createTab(game);
    tab.convertFaithToRelics();
    expect(showCustomPopup).not.toHaveBeenCalled();
    transmute(game, tab);
    expect(showCustomPopup).toHaveBeenCalledTimes(1);
  });
});
