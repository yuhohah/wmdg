import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameStateManager } from '../core/GameState.js';
import { events, GameEvents } from '../core/EventBus.js';
import { OnboardingGuide } from './OnboardingGuide.js';

function element() {
  return {
    style: { display: '', opacity: '1' } as Record<string, string>, textContent: '', innerHTML: '', offsetWidth: 320,
    className: '', dataset: {} as Record<string, string>,
    classList: { contains: vi.fn(() => false), add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
    addEventListener: vi.fn(), focus: vi.fn(), querySelector: vi.fn(),
    getBoundingClientRect: () => ({ top: 200, left: 300, right: 620, bottom: 250, width: 320, height: 50 }),
  };
}

describe('board arranging tip', () => {
  const nodes = new Map<string, ReturnType<typeof element>>();
  let game: GameStateManager;

  beforeEach(() => {
    nodes.clear();
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 900, addEventListener: vi.fn() });
    vi.stubGlobal('document', {
      getElementById: (id: string) => {
        if (!nodes.has(id)) {
          const node = element();
          node.querySelector.mockReturnValue(element());
          nodes.set(id, node);
        }
        return nodes.get(id);
      },
      querySelector: () => null,
    });
    game = new GameStateManager();
    game.hasSeenIntro = true;
  });

  afterEach(() => vi.unstubAllGlobals());

  function guide() {
    const focus = vi.fn();
    return { tour: new OnboardingGuide({ gameState: game, onFocusCard: focus }), focus };
  }

  const title = () => nodes.get('spotlight-balloon-title')?.textContent;

  it('points at the Faithful card header right after the intro', () => {
    const { tour, focus } = guide();
    tour.update();
    expect(title()).toBe('Monte seu quadro');
    expect(focus).toHaveBeenCalledWith('card-followers', true);
  });

  it('waits until the intro is over', () => {
    game.hasSeenIntro = false;
    game.seenCardTutorials.add('guidance-settings');
    const { tour } = guide();
    tour.update();
    expect(title()).toBe('Clique na Esfera');
  });

  it('retires itself once a card is dropped and moves on to the next tutorial', () => {
    const { tour } = guide();
    tour.update();
    events.emit(GameEvents.CARD_ARRANGED);
    expect(game.seenCardTutorials.has('board-arrange')).toBe(true);
    expect(nodes.get('spotlight-tour-overlay')?.style.display).toBe('none');
    tour.update();
    expect(title()).toBe('Os Selos Sagrados');
  });

  it('never shows if a card was dropped before the tip came up', () => {
    const { tour } = guide();
    events.emit(GameEvents.CARD_ARRANGED);
    tour.update();
    expect(title()).toBe('Os Selos Sagrados');
  });
});
