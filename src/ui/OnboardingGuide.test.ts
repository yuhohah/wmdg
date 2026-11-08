import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameStateManager } from '../core/GameState.js';
import { CARD_TUTORIALS, cardTutorialKey } from '../config/cardTutorials.js';
import { OnboardingGuide } from './OnboardingGuide.js';

function element() {
  return {
    style: { display: '', opacity: '1' }, textContent: '', innerHTML: '', offsetWidth: 320,
    className: '', classList: { contains: vi.fn(() => false), add: vi.fn(), remove: vi.fn() },
    addEventListener: vi.fn(), focus: vi.fn(), querySelector: vi.fn(),
    getBoundingClientRect: () => ({ top: 200, left: 300, right: 620, bottom: 250, width: 320, height: 50 }),
  };
}

describe('progressive card tutorial', () => {
  const nodes = new Map<string, ReturnType<typeof element>>();
  let modalOpen = false;
  let modalQueries = 0;
  let game: GameStateManager;

  beforeEach(() => {
    nodes.clear();
    modalOpen = false;
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 900, addEventListener: vi.fn() });
    vi.stubGlobal('document', {
      getElementById: (id: string) => {
        if (!nodes.has(id)) nodes.set(id, element());
        return nodes.get(id);
      },
      querySelectorAll: () => { modalQueries++; return modalOpen ? [element()] : []; },
      querySelector: () => null,
    });
    game = new GameStateManager();
    game.hasSeenIntro = true;
    for (const tutorial of CARD_TUTORIALS) {
      const card = element();
      card.querySelector.mockReturnValue(element());
      nodes.set(tutorial.cardId, card);
    }
  });

  afterEach(() => vi.unstubAllGlobals());

  function guide() {
    const focus = vi.fn();
    return { tour: new OnboardingGuide({ gameState: game, onFocusCard: focus }), focus };
  }

  it('keeps the initial tutorial before explaining newly available cards', () => {
    game.hasSeenIntro = false;
    const { tour, focus } = guide();
    tour.update();
    expect(nodes.get('spotlight-balloon-title')?.textContent).toBe('Toque a Esfera');
    expect(focus).not.toHaveBeenCalled();
    tour.dismiss();
    tour.update();
    expect(focus).toHaveBeenCalledWith('card-unlocks', true);
    expect(nodes.get('spotlight-balloon-skip')?.textContent).toBe('Entendi');
  });

  it('introduces simultaneous unlocks in order, once each, with lore and instructions', () => {
    const { tour, focus } = guide();
    // Leave Gnose locked so the unlock card is still present.
    game.unlocks.filter(u => u.id !== 'unlock_gnose').forEach(u => { u.unlocked = true; });
    for (const tutorial of CARD_TUTORIALS.slice(0, 4)) {
      tour.update();
      expect(focus).toHaveBeenLastCalledWith(tutorial.cardId, true);
      expect(nodes.get('spotlight-balloon-desc')?.textContent).toBe(tutorial.lore);
      expect(nodes.get('spotlight-balloon-action-tip')?.textContent).toBe(tutorial.basics);
      tour.update();
      expect(game.seenCardTutorials.has(tutorial.cardId)).toBe(false);
      tour.dismiss();
      expect(game.seenCardTutorials.has(tutorial.cardId)).toBe(true);
    }
    game.unlocks.find(u => u.id === 'unlock_gnose')!.unlocked = true;
    tour.update();
    expect(focus).toHaveBeenLastCalledWith('card-gnose', true);
    tour.dismiss();
    tour.update();
    expect(nodes.get('spotlight-tour-overlay')?.style.display).toBe('none');
    expect(focus).toHaveBeenCalledTimes(5);
  });

  it('holds the Guardian tutorial until the first Ascension, then shows it once', () => {
    game.unlocks.forEach(u => { u.unlocked = true; });
    CARD_TUTORIALS.slice(0, 5).forEach(t => game.seenCardTutorials.add(cardTutorialKey(t)));
    const { tour, focus } = guide();
    tour.update();
    expect(focus).not.toHaveBeenCalled();
    game.gnoseResets = 1;
    tour.update();
    expect(focus).toHaveBeenCalledWith('card-gnose', true);
    expect(nodes.get('spotlight-balloon-title')?.textContent).toBe(CARD_TUTORIALS[5].title);
    tour.dismiss();
    expect(game.seenCardTutorials.has(cardTutorialKey(CARD_TUTORIALS[5]))).toBe(true);
    tour.update();
    expect(nodes.get('spotlight-tour-overlay')?.style.display).toBe('none');
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('does not search the page on every tick when no tutorial is pending', () => {
    game.unlocks.forEach(u => { u.unlocked = true; });
    game.gnoseResets = 1;
    CARD_TUTORIALS.forEach(t => game.seenCardTutorials.add(cardTutorialKey(t)));
    const { tour, focus } = guide();
    modalQueries = 0;
    for (let i = 0; i < 20; i++) tour.update();
    expect(modalQueries).toBe(0);
    expect(focus).not.toHaveBeenCalled();
    expect(nodes.get('spotlight-tour-overlay')?.style.display).toBe('none');
  });

  it('still waits for modals while a tutorial is pending', () => {
    game.seenCardTutorials.add('card-unlocks');
    game.unlocks.find(u => u.id === 'unlock_incarnation')!.unlocked = true;
    const { tour } = guide();
    modalQueries = 0;
    tour.update();
    expect(modalQueries).toBe(1);
  });

  it('waits for modal closure and for the unlocked card to be visible', () => {
    game.seenCardTutorials.add('card-unlocks');
    game.unlocks.find(u => u.id === 'unlock_incarnation')!.unlocked = true;
    const { tour, focus } = guide();
    modalOpen = true;
    tour.update();
    expect(focus).not.toHaveBeenCalled();
    modalOpen = false;
    nodes.get('card-incarnation')!.style.display = 'none';
    tour.update();
    expect(focus).not.toHaveBeenCalled();
    nodes.get('card-incarnation')!.style.display = 'flex';
    tour.update();
    expect(focus).toHaveBeenCalledWith('card-incarnation', true);
  });

  it('persists acknowledgements across saves and Gnose, and clears them for a new game', () => {
    game.unlocks.forEach(u => { u.unlocked = true; });
    game.faithPoints = 1e18;
    CARD_TUTORIALS.forEach(t => game.seenCardTutorials.add(cardTutorialKey(t)));
    expect(game.performGnoseReset().success).toBe(true);
    const loaded = new GameStateManager();
    loaded.applySaveData(game.buildSaveData());
    expect([...loaded.seenCardTutorials]).toEqual(CARD_TUTORIALS.map(cardTutorialKey));
    loaded.resetToDefaults();
    expect(loaded.seenCardTutorials.size).toBe(0);
    const legacy = game.buildSaveData();
    delete legacy.stats.seenCardTutorials;
    loaded.applySaveData(legacy);
    expect(loaded.seenCardTutorials.size).toBe(0);
  });
});
