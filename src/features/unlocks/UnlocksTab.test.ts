import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import type { AudioManager } from '../../systems/audio.js';
import { UnlocksTab } from './UnlocksTab.js';

describe('Unlocks card visibility', () => {
  const element = () => ({ style: { display: '' } });
  let card: ReturnType<typeof element>;
  let ray: ReturnType<typeof element>;
  let quickBtn: ReturnType<typeof element>;
  let game: GameStateManager;
  let tab: UnlocksTab;

  beforeEach(() => {
    card = element();
    ray = element();
    quickBtn = element();
    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'card-unlocks' ? card : id === 'ray-unlocks' ? ray : null),
      querySelector: () => quickBtn,
    });
    game = new GameStateManager();
    game.unlocks.forEach(u => { u.unlocked = true; });
    tab = new UnlocksTab({ gameState: game, audio: {} as AudioManager });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('hides the card once every Seal is open', () => {
    tab.syncVisibility();
    expect(card.style.display).toBe('none');
    expect(ray.style.display).toBe('none');
    expect(quickBtn.style.display).toBe('none');
  });

  it('brings a hidden card back after an Ascension closes the Seals', () => {
    tab.syncVisibility();
    game.faithPoints = 1e18;
    expect(game.performGnoseReset().success).toBe(true);
    tab.syncVisibility();
    expect(card.style.display).toBe('flex');
    expect(ray.style.display).toBe('');
    expect(quickBtn.style.display).toBe('inline-flex');
  });
});
