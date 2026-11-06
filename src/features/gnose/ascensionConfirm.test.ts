import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import { cultDialog } from '../../ui/CultDialog.js';
import { GnoseTab, ascensionSummary } from './GnoseTab.js';

vi.mock('../../ui/CultDialog.js', () => ({ cultDialog: vi.fn() }));

describe('Ascension confirmation', () => {
  const dialog = vi.mocked(cultDialog);
  let game: GameStateManager;
  let tab: GnoseTab;
  let execute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dialog.mockReset();
    game = new GameStateManager();
    game.unlocks.find(u => u.id === 'unlock_gnose')!.unlocked = true;
    game.faithPoints = 1e18;
    execute = vi.fn();
    tab = Object.assign(Object.create(GnoseTab.prototype), {
      options: { gameState: game, audio: { playTone: vi.fn() } },
      executeGnoseReset: execute,
    });
  });

  it('asks on the first Ascension, then turns the confirmation off', async () => {
    dialog.mockResolvedValue(true);
    await tab.handleResetClick();
    expect(dialog).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(game.confirmGnoseReset).toBe(false);
    await tab.handleResetClick();
    expect(dialog).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('keeps asking when the first Ascension is cancelled', async () => {
    dialog.mockResolvedValue(false);
    await tab.handleResetClick();
    expect(execute).not.toHaveBeenCalled();
    expect(game.confirmGnoseReset).toBe(true);
  });

  it('respects a confirmation turned on after the first Ascension', async () => {
    game.gnoseResets = 2;
    dialog.mockResolvedValue(true);
    await tab.handleResetClick();
    expect(dialog).toHaveBeenCalledTimes(1);
    expect(game.confirmGnoseReset).toBe(true);
  });

  it('summarizes the gain, the losses and what is kept', () => {
    const text = ascensionSummary(game);
    expect(text).toContain(`+${game.getGnoseToGet()} Gnose`);
    expect(text).toContain('Você perde: Fé, Fiéis, Fervor, Ritos, Avatar, Fragmentos, Relíquias e Selos.');
    expect(text).toContain('Você mantém: Gnose, nós da Árvore, Guardiões derrotados e conquistas.');
  });

  it('moves preserved Relics and the Selo da Encarnação to the kept list', () => {
    vi.spyOn(game, 'hasGnoseUpgrade').mockImplementation(id => id === 'gn_keep_relics' || id === 'gn_memoria_selos');
    const text = ascensionSummary(game);
    expect(text).toContain('Você perde: Fé, Fiéis, Fervor, Ritos, Avatar, Fragmentos e Selos.');
    expect(text).toContain('Você mantém: Gnose, nós da Árvore, Guardiões derrotados, conquistas, níveis de Relíquias e Selo da Encarnação.');
  });
});
