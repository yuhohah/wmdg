import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import { RelicsTab } from './RelicsTab.js';
import type { AudioManager } from '../../systems/audio.js';

class FakeElement {
  public id = '';
  public className = '';
  public textContent = '';
  public open = false;
  public hidden = false;
  public checked = false;
  public disabled = false;
  public style: Record<string, string> = {};
  public children: FakeElement[] = [];
  private _innerHTML = '';
  public attrs = new Map<string, string>();
  public classList = {
    contains: (cls: string) => this.className.split(/\s+/).includes(cls),
    toggle: (cls: string, force?: boolean) => {
      const set = new Set(this.className.split(/\s+/).filter(Boolean));
      const next = force ?? !set.has(cls);
      if (next) set.add(cls);
      else set.delete(cls);
      this.className = [...set].join(' ');
      return next;
    },
  };

  constructor(public tagName: string) {}

  public get innerHTML(): string {
    return this._innerHTML;
  }

  public set innerHTML(value: string) {
    this._innerHTML = value;
    if (value === '') this.children = [];
  }

  public appendChild(child: FakeElement): FakeElement {
    this.children.push(child);
    return child;
  }

  public append(...nodes: FakeElement[]): void {
    this.children.push(...nodes);
  }

  public setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }

  public addEventListener(): void {}

  public querySelector(selector: string): FakeElement | null {
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      for (const child of this.children) {
        if (child.classList.contains(cls)) return child;
        const nested = child.querySelector(selector);
        if (nested) return nested;
      }
    }
    return null;
  }
}

describe('RelicsTab finite relic folding', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('minimizes capped relics into closed details as soon as gn_unlimited_relics is owned', () => {
    const elements = new Map<string, FakeElement>();
    const listEl = new FakeElement('div');
    listEl.id = 'relic-upgrades-list';
    elements.set('relic-upgrades-list', listEl);

    vi.stubGlobal('document', {
      getElementById: (id: string) => elements.get(id) ?? null,
      createElement: (tag: string) => new FakeElement(tag),
    });

    const gameState = new GameStateManager();
    const audio = { playChime: vi.fn(), playTone: vi.fn() } as unknown as AudioManager;
    const tab = new RelicsTab({
      gameState,
      audio,
      spawnFloatingText: vi.fn(),
    });

    // Without gn_unlimited_relics, all 6 relics appear directly at top level.
    tab.renderList();
    expect(listEl.children.map((c) => c.id)).toEqual([
      'card-relic_cornucopia',
      'card-relic_torch',
      'card-relic_phoenix',
      'card-relic_caduceus',
      'card-relic_draupnir',
      'card-relic_ark',
    ]);
    expect(listEl.querySelector('.finite-relics')).toBeNull();

    // Owning gn_unlimited_relics alone (without gn_keep_relics) folds the 4 capped relics.
    gameState.unlockedGnoseUpgrades.add('gn_unlimited_relics');
    tab.renderList();

    expect(listEl.children.map((c) => c.id || c.className)).toEqual([
      'card-relic_cornucopia',
      'card-relic_torch',
      'finite-relics',
    ]);
    const details = listEl.children[2];
    expect(details.tagName).toBe('details');
    expect(details.open).toBe(false);
    expect(details.children[0].tagName).toBe('summary');
    expect(details.children[0].textContent).toBe('Relíquias com limite (0/4 no máximo)');
    expect(details.children[1].className).toBe('finite-relics-list');
    expect(details.children[1].children.map((c) => c.id)).toEqual([
      'card-relic_phoenix',
      'card-relic_caduceus',
      'card-relic_draupnir',
      'card-relic_ark',
    ]);

    // Summary counter updates live as capped relics reach their max level.
    const phoenix = gameState.relicUpgrades.find((r) => r.id === 'relic_phoenix')!;
    phoenix.level = 1;
    tab.updateButtonStates();
    expect(details.children[0].textContent).toBe('Relíquias com limite (1/4 no máximo)');
  });
});
