import type { GameStateManager } from '../core/GameState.js';
import { GNOSE_UPGRADES } from '../config/gnose.js';

export const DEMIURGE_RESOURCES = ['faith', 'followers', 'fervor', 'relics', 'gnose'] as const;
export const DEMIURGE_LABELS = ['Fé', 'Fiéis', 'Fervor', 'Fragmentos', 'Gnose'];
export interface DemiurgeState {
  phase: 'dormant' | 'announced' | 'walking' | 'draining' | 'approaching' | 'fighting' | 'dying' | 'defeated' | 'lost';
  target: number;
  elapsed: number;
  initialResource: number;
  frozenDrain?: number;
}
export const newDemiurge = (): DemiurgeState => ({ phase: 'dormant', target: 0, elapsed: 0, initialResource: 0, frozenDrain: 0 });
export function isDemiurgeState(value: unknown): value is DemiurgeState {
  if (!value || typeof value !== 'object') return false;
  const v = value as DemiurgeState;
  return ['dormant', 'announced', 'walking', 'draining', 'approaching', 'fighting', 'dying', 'defeated', 'lost'].includes(v.phase)
    && Number.isInteger(v.target) && v.target >= 0 && v.target < 5
    && [v.elapsed, v.initialResource].every(n => Number.isFinite(n) && n >= 0)
    && (v.frozenDrain === undefined || (Number.isFinite(v.frozenDrain) && v.frozenDrain >= 0 && v.frozenDrain <= 1));
}
export function summonDemiurge(gs: GameStateManager): boolean {
  if (gs.demiurge.phase !== 'dormant' || !gs.isBossDefeated('boss_tiamat')
    || !GNOSE_UPGRADES.every(u => gs.hasGnoseUpgrade(u.id))) return false;
  gs.demiurge.phase = 'announced';
  gs.campaignEnding = 'pending';
  return true;
}
function amount(gs: GameStateManager): number {
  return [gs.faithPoints, gs.getTotalFollowersCount(), gs.fervorPoints, gs.relicPoints, gs.gnosePoints][gs.demiurge.target];
}
function capResource(gs: GameStateManager, limit: number): void {
  switch (gs.demiurge.target) {
    case 0: gs.faithPoints = Math.min(gs.faithPoints, limit); break;
    case 1: {
      let remove = Math.max(0, gs.getTotalFollowersCount() - Math.floor(limit));
      for (const follower of gs.followers) {
        const take = Math.min(remove, follower.count);
        follower.count -= take;
        remove -= take;
      }
      break;
    }
    case 2: gs.fervorPoints = Math.min(gs.fervorPoints, limit); break;
    case 3: gs.relicPoints = Math.min(gs.relicPoints, limit); break;
    case 4: gs.gnosePoints = Math.min(gs.gnosePoints, limit); break;
  }
}
/** Only advanced during visible play; offline recovery never consumes the player's response window. */
export function tickDemiurge(gs: GameStateManager, seconds: number): void {
  const d = gs.demiurge;
  let remaining = Math.max(0, seconds);
  while (remaining > 0 && ['walking', 'draining', 'dying'].includes(d.phase)) {
    const dt = Math.min(remaining, 0.1);
    remaining -= dt;
    d.elapsed += dt;
    if (d.phase === 'dying') {
      if (d.elapsed >= 1.7) d.phase = 'defeated';
    } else if (d.phase === 'walking') {
      if (d.elapsed >= 2) { d.phase = 'draining'; d.elapsed = 0; d.initialResource = amount(gs); }
    } else {
      capResource(gs, d.initialResource * Math.max(0, 1 - d.elapsed / 4));
      if (amount(gs) <= 0) {
        d.elapsed = 0;
        if (d.target === 4) d.phase = 'lost';
        else { d.target++; d.phase = 'walking'; }
      }
    }
  }
}
export function challengeDemiurge(gs: GameStateManager): boolean {
  if (!['walking', 'draining', 'defeated'].includes(gs.demiurge.phase) || gs.activeBossBattle) return false;
  gs.demiurge.frozenDrain = gs.demiurge.phase === 'draining' ? Math.min(1, gs.demiurge.elapsed / 4) : 0;
  gs.demiurge.phase = 'approaching';
  gs.demiurge.elapsed = 0;
  return true;
}
/** Exhausted production stays suppressed during the invasion; victory restores production. */
export function demiurgeProductionMultiplier(gs: GameStateManager, resource: number): number {
  const d = gs.demiurge;
  if (gs.isBossDefeated('boss_demiurge')) return 1;
  if (!['walking', 'draining', 'approaching', 'fighting', 'lost'].includes(d.phase)) return 1;
  if (d.phase === 'lost' || resource < d.target) return 0;
  if (resource === d.target && ['approaching', 'fighting'].includes(d.phase)) return 1 - (d.frozenDrain ?? 0);
  if (resource === d.target && d.phase === 'draining') return Math.max(0, 1 - d.elapsed / 4);
  return 1;
}
