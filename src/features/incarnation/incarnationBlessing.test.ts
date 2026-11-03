import { describe, expect, it } from 'vitest';
import { GameStateManager } from '../../core/GameState.js';
import { IncarnationAltar } from '../../ui/incarnationAltar.js';
import { IncarnationTab } from './IncarnationTab.js';

function setup() {
  const gameState = new GameStateManager();
  const classes = new Set<string>();
  const altar: IncarnationAltar = Object.create(IncarnationAltar.prototype);
  Reflect.set(altar, 'blessingActive', false);
  Reflect.set(altar, 'container', { classList: {
    toggle: (name: string, active: boolean) => active ? classes.add(name) : classes.delete(name),
  } });
  const tab: IncarnationTab = Object.create(IncarnationTab.prototype);
  Reflect.set(tab, 'options', { gameState });
  tab.altar = altar;
  return { gameState, tab, altar, classes };
}

describe('incarnation blessing light', () => {
  it('lights the avatar for a timed blessing and clears when its timer expires', () => {
    const { gameState, tab, altar, classes } = setup();
    tab.updateBlessingBar();
    expect(classes.has('blessing-active')).toBe(false);
    gameState.addIncarnationBoost(1);
    tab.updateBlessingBar();
    expect(classes.has('blessing-active')).toBe(true);
    // Evolving changes the sprite, not the active blessing overlay.
    altar.setStage(3, true);
    expect(classes.has('blessing-active')).toBe(true);
    gameState.tick(2);
    tab.updateBlessingBar();
    expect(classes.has('blessing-active')).toBe(false);
  });

  it('also reflects the permanent blessing once incarnation is unlocked', () => {
    const { gameState, tab, classes } = setup();
    gameState.unlockedGnoseUpgrades.add('gn_bencao_eterna');
    tab.updateBlessingBar();
    expect(classes.has('blessing-active')).toBe(false);
    const unlock = gameState.unlocks.find(u => u.id === 'unlock_incarnation');
    if (!unlock) throw new Error('Missing incarnation unlock');
    unlock.unlocked = true;
    tab.updateBlessingBar();
    expect(classes.has('blessing-active')).toBe(true);
  });
});
