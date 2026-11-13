import type { GameStateManager } from '../core/GameState.js';

export const CARD_NAV_SHORTCUTS = [
  { key: '1', cardId: 'card-altar-sphere', label: 'Esfera' },
  { key: '2', cardId: 'card-followers', label: 'Fiéis' },
  { key: '3', cardId: 'card-incarnation', label: 'Encarnação' },
  { key: '4', cardId: 'card-fervor', label: 'Fervor' },
  { key: '5', cardId: 'card-relics', label: 'Relíquias' },
  { key: '6', cardId: 'card-gnose', label: 'Gnose' },
] as const;
export const FERVOR_SHORTCUTS = ['q', 'w', 'e', 'r', 't', 'y'] as const;
export const RELIC_SHORTCUTS = ['a', 's', 'd', 'f', 'g', 'h'] as const;

export function canUseGameplayShortcut(event: KeyboardEvent, options: { allowedControl?: HTMLElement | null; allowButtonFocus?: boolean } = {}): boolean {
  if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return false;
  if (document.hidden || !document.querySelector('#gameplay-screen.active')) return false;
  if (document.querySelector('dialog[open], .modal-overlay.open, #test-menu-overlay.visible')) return false;
  const target = event.target as HTMLElement | null;
  if (target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="slider"]')) return false;
  const control = target?.closest?.('button, a[href], [role="button"]');
  return !control || control === options.allowedControl || options.allowButtonFocus === true;
}

interface ShortcutActions {
  gameState: GameStateManager;
  focusCard?: (cardId: string) => void;
  buyFollower: () => void;
  buyMaxFollowers: () => void;
  buyFervor: (index: number) => void;
  buyRelic: (index: number) => void;
  transmute: () => void;
  collectMiracle: () => void;
  boostIncarnation: () => void;
  evolveIncarnation: () => void;
}

export function createGameplayShortcutActions(actions: ShortcutActions): Record<string, () => void> {
  const game = actions.gameState;
  const outsideCombat = (action: () => void) => () => { if (!game.activeBossBattle) action(); };
  const isCardUnlocked = (cardId: string): boolean => {
    if (cardId === 'card-incarnation') return game.isIncarnationUnlocked();
    if (cardId === 'card-fervor') return game.isFervorUpgradesUnlocked();
    if (cardId === 'card-relics') return game.isRelicsUnlocked();
    if (cardId === 'card-gnose') return game.isGnoseUnlocked();
    return true;
  };
  const bindings: Record<string, () => void> = {
    z: outsideCombat(actions.buyFollower),
    x: outsideCombat(() => { if (game.isConvertMaxUnlocked()) actions.buyMaxFollowers(); }),
    capslock: outsideCombat(() => { if (game.isRelicsUnlocked()) actions.transmute(); }),
    m: actions.collectMiracle,
    i: outsideCombat(() => { if (game.isIncarnationUnlocked()) actions.boostIncarnation(); }),
    u: outsideCombat(() => { if (game.isIncarnationUnlocked()) actions.evolveIncarnation(); }),
  };
  CARD_NAV_SHORTCUTS.forEach(({ key, cardId }) => {
    bindings[key] = outsideCombat(() => {
      if (isCardUnlocked(cardId)) actions.focusCard?.(cardId);
    });
  });
  FERVOR_SHORTCUTS.forEach((key, index) => {
    bindings[key] = outsideCombat(() => {
      if (game.isFervorUpgradesUnlocked() && game.fervorUpgrades[index]) actions.buyFervor(index);
    });
  });
  RELIC_SHORTCUTS.forEach((key, index) => {
    bindings[key] = outsideCombat(() => {
      if (game.isRelicsUnlocked() && game.relicUpgrades[index]) actions.buyRelic(index);
    });
  });
  return bindings;
}

export class GameplayShortcuts {
  constructor(private actions: Record<string, () => void>) {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const action = this.actions[event.key.toLowerCase()];
    if (!action || !canUseGameplayShortcut(event, { allowButtonFocus: true })) return;
    event.preventDefault();
    if (!event.repeat) action();
  };

  public destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
  }
}
