import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameStateManager } from '../core/GameState.js';
import { events, GameEvents } from '../core/EventBus.js';
import { formatNumber } from '../systems/calculations.js';
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
  const playerView = { panX: -420, panY: 75, zoom: 0.55, focusedCardId: 'card-altar-sphere' };
  let game: GameStateManager;
  let modalOpen = false;

  beforeEach(() => {
    nodes.clear();
    modalOpen = false;
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
      querySelector: (selector: string) => (modalOpen && selector.includes('modal-overlay') ? element() : null),
    });
    game = new GameStateManager();
    game.hasSeenIntro = true;
  });

  afterEach(() => vi.unstubAllGlobals());

  function guide() {
    const focus = vi.fn();
    const camera = { get: vi.fn(() => playerView), restore: vi.fn() };
    const tour = new OnboardingGuide({ gameState: game, onFocusCard: focus });
    tour.setCamera(camera.get, camera.restore);
    return { tour, focus, camera };
  }

  const title = () => nodes.get('spotlight-balloon-title')?.textContent;
  const skip = () => nodes.get('spotlight-balloon-skip')!.addEventListener.mock.calls[0][1]({ stopPropagation: () => {} });

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

  describe('skipping intro steps', () => {
    function inIntro() {
      game.hasSeenIntro = false;
      game.seenCardTutorials.add('guidance-settings');
      const started = guide();
      started.tour.update();
      return started;
    }

    it('moves from the Sphere step to converting the first Faithful', () => {
      const { focus } = inIntro();
      skip();
      expect(title()).toBe('Converta seu primeiro fiel');
      expect(game.hasSeenIntro).toBe(false);
      expect(focus).toHaveBeenCalledWith('card-followers', true);
    });

    it('shows how much Faith the first conversion still needs', () => {
      inIntro();
      skip();
      const cost = game.getItemCost(game.followers[0]);
      expect(title()).toBe('Converta seu primeiro fiel');
      expect(nodes.get('spotlight-tracker-val')?.textContent).toBe(`${formatNumber(0)} / ${formatNumber(cost)} Fé (0%)`);
    });

    it('ends the intro when the convert step is skipped too', () => {
      inIntro();
      skip();
      skip();
      expect(game.hasSeenIntro).toBe(true);
    });
  });

  describe('camera after tutorials', () => {
    // Monte seu quadro → Os Selos Sagrados is the row a finished intro opens.
    const finishRow = (tour: OnboardingGuide) => { skip(); tour.update(); skip(); tour.update(); };

    it('returns the camera once the last tutorial in a row is done', () => {
      const { tour, camera } = guide();
      tour.update();
      skip();
      tour.update();
      expect(title()).toBe('Os Selos Sagrados');
      expect(camera.restore).not.toHaveBeenCalled();
      skip();
      tour.update();
      expect(camera.restore).toHaveBeenCalledExactlyOnceWith(playerView);
      expect(camera.get).toHaveBeenCalledTimes(1);
    });

    it('forgets the player view when a modal interrupts, then starts over on the next row', () => {
      const { tour, camera } = guide();
      tour.update();
      modalOpen = true;
      tour.update();
      modalOpen = false;
      tour.update();
      finishRow(tour);
      expect(camera.restore).not.toHaveBeenCalled();

      game.unlocks.find(u => u.id === 'unlock_incarnation')!.unlocked = true;
      tour.update();
      expect(title()).toBe('Uma forma para a Esfera');
      skip();
      tour.update();
      expect(camera.restore).toHaveBeenCalledOnce();
    });

    it('forgets the player view when tips are hidden mid-tutorial', () => {
      const { tour, camera } = guide();
      tour.update();
      game.hideGuidance = true;
      tour.update();
      game.hideGuidance = false;
      tour.update();
      finishRow(tour);
      expect(camera.restore).not.toHaveBeenCalled();
    });
  });
});
