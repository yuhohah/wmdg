import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameStateManager } from '../core/GameState.js';
import { HUDController } from './HUDController.js';
import { icon } from './icons.js';

interface MockElement {
  id: string;
  className: string;
  hidden: boolean;
  tabIndex: number;
  textContent: string;
  innerHTML: string;
  dataset: Record<string, string>;
  style: Record<string, string>;
  isConnected: boolean;
  classList: { toggle: (cls: string, force?: boolean) => void };
  hasAttribute: (attr: string) => boolean;
  setAttribute: (attr: string, val: string) => void;
  addEventListener: (event: string, cb: (e?: unknown) => void) => void;
  trigger: (event: string, payload?: unknown) => void;
  querySelector: (selector: string) => MockElement | null;
  getBoundingClientRect: () => { left: number; bottom: number; width: number; height: number };
  remove: () => void;
}

function createMockElement(id = '', className = ''): MockElement {
  const listeners = new Map<string, Array<(e?: unknown) => void>>();
  const children = new Map<string, MockElement>();
  const attrs = new Map<string, string>();
  const el: MockElement = {
    id,
    className,
    hidden: false,
    tabIndex: -1,
    textContent: '',
    innerHTML: '',
    dataset: {},
    style: {},
    isConnected: true,
    classList: { toggle: vi.fn() },
    hasAttribute: (attr: string) => attrs.has(attr),
    setAttribute: (attr: string, val: string) => {
      attrs.set(attr, val);
    },
    addEventListener: (event: string, cb: (e?: unknown) => void) => {
      const list = listeners.get(event) ?? [];
      list.push(cb);
      listeners.set(event, list);
    },
    trigger: (event: string, payload?: unknown) => {
      for (const cb of listeners.get(event) ?? []) {
        cb(payload);
      }
    },
    querySelector: (selector: string) => children.get(selector) ?? null,
    getBoundingClientRect: () => ({ left: 100, bottom: 60, width: 160, height: 48 }),
    remove: vi.fn(),
  };

  children.set('.currency-tooltip-title', createLeafElement());
  children.set('.currency-tooltip-desc', createLeafElement());
  children.set('.currency-tooltip-stats', createLeafElement());
  return el;
}

function createLeafElement(): MockElement {
  return {
    id: '',
    className: '',
    hidden: false,
    tabIndex: -1,
    textContent: '',
    innerHTML: '',
    dataset: {},
    style: {},
    isConnected: true,
    classList: { toggle: vi.fn() },
    hasAttribute: () => false,
    setAttribute: vi.fn(),
    addEventListener: vi.fn(),
    trigger: vi.fn(),
    querySelector: () => null,
    getBoundingClientRect: () => ({ left: 0, bottom: 0, width: 240, height: 80 }),
    remove: vi.fn(),
  };
}

describe('HUDController & Icons', () => {
  let gameState: GameStateManager;
  let hud: HUDController;
  let bySelector: Map<string, MockElement>;
  let createdTooltip: MockElement | null = null;

  beforeEach(() => {
    bySelector = new Map<string, MockElement>([
      ['.resource-item-faith', createMockElement('hud-faith-item', 'resource-item resource-item-faith')],
      ['.resource-item-followers', createMockElement('hud-followers-item', 'resource-item resource-item-followers')],
      ['.resource-item-fervor', createMockElement('hud-fervor-item', 'resource-item resource-item-fervor')],
      ['.resource-item-relic', createMockElement('hud-relic-item', 'resource-item resource-item-relic')],
      ['.resource-item-gnose', createMockElement('hud-gnose-item', 'resource-item resource-item-gnose')],
    ]);

    const byId = new Map<string, MockElement>([
      ['faith-counter', createLeafElement()],
      ['faith-per-sec-counter', createLeafElement()],
      ['followers-counter', createLeafElement()],
      ['fervor-counter-hud', createLeafElement()],
      ['fervor-rate-counter-hud', createLeafElement()],
      ['relic-counter-hud', createLeafElement()],
      ['relic-rate-counter-hud', createLeafElement()],
      ['gnose-counter-hud', createLeafElement()],
      ['gnose-mult-counter-hud', createLeafElement()],
    ]);

    createdTooltip = null;

    vi.stubGlobal('window', {
      innerWidth: 1280,
      innerHeight: 800,
      addEventListener: vi.fn(),
    });
    vi.stubGlobal('document', {
      getElementById: (id: string) => {
        if (id === 'currency-tooltip') return createdTooltip;
        return byId.get(id) ?? null;
      },
      querySelector: (sel: string) => bySelector.get(sel) ?? null,
      createElement: () => {
        createdTooltip = createMockElement('currency-tooltip', 'currency-tooltip');
        return createdTooltip;
      },
      body: {
        appendChild: vi.fn(),
      },
      addEventListener: vi.fn(),
    });

    gameState = new GameStateManager();
    hud = new HUDController({ gameState });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows and updates currency tooltip when hovering each HUD currency item', () => {
    expect(createdTooltip).toBeTruthy();
    expect(createdTooltip!.hidden).toBe(true);

    const faithItem = bySelector.get('.resource-item-faith')!;
    faithItem.trigger('mouseenter');

    expect(createdTooltip!.hidden).toBe(false);
    expect(createdTooltip!.querySelector('.currency-tooltip-title')?.textContent).toBe('Fé');
    expect(createdTooltip!.querySelector('.currency-tooltip-desc')?.textContent).toContain('Relíquias Divinas');
    expect(createdTooltip!.querySelector('.currency-tooltip-stats')?.textContent).toContain('Saldo: 1e0 Fé');

    // Live update while hovered
    gameState.faithPoints = 250;
    hud.update();
    expect(createdTooltip!.querySelector('.currency-tooltip-stats')?.textContent).toContain('Saldo: 2.5e2 Fé');

    faithItem.trigger('mouseleave');
    expect(createdTooltip!.hidden).toBe(true);
  });

  it('renders tooltip data for followers, fervor, relics, and gnose', () => {
    const followersItem = bySelector.get('.resource-item-followers')!;
    followersItem.trigger('focusin');
    expect(createdTooltip!.hidden).toBe(false);
    expect(createdTooltip!.querySelector('.currency-tooltip-title')?.textContent).toBe('Fiéis');

    const relicsData = hud.getCurrencyTooltipData('relics');
    expect(relicsData.title).toBe('Fragmentos');
    expect(relicsData.description).toContain('Relíquias Divinas');

    const gnoseData = hud.getCurrencyTooltipData('gnose');
    expect(gnoseData.title).toBe('Gnose');
  });

  it('renders crisp 16x16 SVG icons for sphere and followers', () => {
    const sphereSvg = icon('sphere');
    const followersSvg = icon('followers');
    expect(sphereSvg).toContain('viewBox="0 0 16 16"');
    expect(followersSvg).toContain('viewBox="0 0 16 16"');
  });
});
