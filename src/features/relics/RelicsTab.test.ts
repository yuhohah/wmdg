import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import type { AudioManager } from '../../systems/audio.js';
import * as CultDialogModule from '../../ui/CultDialog.js';
import { RelicsTab } from './RelicsTab.js';

describe('direct transmutation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('transmutes immediately on button click without asking for confirmation', () => {
    vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 800 });
    const dialogSpy = vi.spyOn(CultDialogModule, 'cultDialog');
    let clickHandler: (() => void) | undefined;
    const mockBtn = {
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (event === 'click') clickHandler = cb;
      }),
      disabled: false,
    };
    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'btn-convert-relics' ? mockBtn : null),
    });

    const game = new GameStateManager();
    game.unlocks.find(u => u.id === 'unlock_relics')!.unlocked = true;
    game.faithPoints = 1e15;
    game.relicConvertCooldown = 0;

    new RelicsTab({
      gameState: game,
      audio: { playChime: vi.fn() } as unknown as AudioManager,
      spawnFloatingText: vi.fn(),
    });
    expect(clickHandler).toBeDefined();
    clickHandler!();

    expect(dialogSpy).not.toHaveBeenCalled();
    expect(game.relicPoints).toBeGreaterThan(0);
  });
});
