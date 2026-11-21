import type { PlayerArchetype } from './types.js';

export interface PlayerBehavior {
  name: string;
  initialClickCps: number;
  routineClickCps: number;
  combatClickCps: number;
  maxInteractionCps: number;
  decisionDelaySec: number;
  miracleCatchChance: number;
  miracleResponseSec: number;
  riftResponseSec: number;
  /** Probability [0..1] of executing a parry wave cleanly without missing or hitting a trap. */
  parryAccuracy: number;
  /** Guardian Curse stacks at which the player pauses progression to purify against the previous boss. */
  cursePurifyThreshold: number;
  blessingTargetSec: number;
  blessingMode: 'maintain' | 'burst' | 'after_purchase';
  /** Elapsed campaign time; prestige and return visits never restart this window. */
  sphereManualUntilSec: number;
  postGnoseRecoveryClicks: boolean;
  blessingManualUntilSec: number;
  routineBurstEverySec: number;
  routineBurstDurationSec: number;
  initialVisitDurationSec: number;
  visitDurationSec: number;
  absenceMinSec: number;
  absenceMaxSec: number;
}

export const ACTIVE_BEHAVIOR: Readonly<PlayerBehavior> = {
  name: 'Ativo (presença contínua)', initialClickCps: 5, routineClickCps: 2,
  combatClickCps: 5, maxInteractionCps: 5, decisionDelaySec: 2.5,
  miracleCatchChance: 0.7, miracleResponseSec: 1, riftResponseSec: 0.28,
  parryAccuracy: 1, cursePurifyThreshold: 3,
  blessingTargetSec: 60, blessingMode: 'maintain', sphereManualUntilSec: Infinity, postGnoseRecoveryClicks: false, blessingManualUntilSec: Infinity,
  routineBurstEverySec: Infinity, routineBurstDurationSec: Infinity,
  initialVisitDurationSec: Infinity, visitDurationSec: Infinity, absenceMinSec: 0, absenceMaxSec: 0,
};

export const PLAYER_BEHAVIORS: Record<PlayerArchetype, Readonly<PlayerBehavior>> = {
  active: ACTIVE_BEHAVIOR,
  casual: {
    name: 'Casual (8 min de jogo a cada 20 min)', initialClickCps: 2, routineClickCps: 1,
    combatClickCps: 2, maxInteractionCps: 2.5, decisionDelaySec: 5,
    miracleCatchChance: 0.8, miracleResponseSec: 3, riftResponseSec: 0.75,
    parryAccuracy: 0.85, cursePurifyThreshold: 2,
    blessingTargetSec: 15, blessingMode: 'after_purchase', sphereManualUntilSec: Infinity, postGnoseRecoveryClicks: false, blessingManualUntilSec: Infinity,
    routineBurstEverySec: Infinity, routineBurstDurationSec: Infinity,
    // Sessions start at 0, 20, 40… minutes: 8 minutes present, then 12 away.
    initialVisitDurationSec: 480, visitDurationSec: 480, absenceMinSec: 720, absenceMaxSec: 720,
  },
  afk: {
    name: 'AFK (10 min ativos, recuperação e aparadas)', initialClickCps: 2, routineClickCps: 1,
    combatClickCps: 0, maxInteractionCps: 2, decisionDelaySec: 12,
    miracleCatchChance: 0, miracleResponseSec: 0, riftResponseSec: 0.6,
    parryAccuracy: 0.5, cursePurifyThreshold: 2,
    blessingTargetSec: 60, blessingMode: 'maintain', sphereManualUntilSec: 600, postGnoseRecoveryClicks: true, blessingManualUntilSec: 600,
    routineBurstEverySec: Infinity, routineBurstDurationSec: Infinity,
    initialVisitDurationSec: Infinity, visitDurationSec: Infinity, absenceMinSec: 0, absenceMaxSec: 0,
  },
};

export function manualSphereAllowed(behavior: Readonly<PlayerBehavior>, nowSec: number): boolean {
  return nowSec + 1e-8 < behavior.sphereManualUntilSec;
}

export function manualBlessingAllowed(behavior: Readonly<PlayerBehavior>, nowSec: number): boolean {
  return nowSec + 1e-8 < behavior.blessingManualUntilSec;
}

export function routineClicksAvailable(behavior: Readonly<PlayerBehavior>, nowSec: number, visitStartedAt: number): boolean {
  if (!manualSphereAllowed(behavior, nowSec)) return false;
  if (!Number.isFinite(behavior.routineBurstEverySec)) return behavior.routineBurstDurationSec > 0;
  if (behavior.routineBurstEverySec <= 0) return false;
  const phase = (nowSec - visitStartedAt + 1e-8) % behavior.routineBurstEverySec;
  return phase < behavior.routineBurstDurationSec;
}

export function describeBehavior(profile: PlayerArchetype): string {
  if (profile === 'active') return 'Ativo: presença contínua, 5 cliques/s nos combates, manutenção contínua do 2×, 70% dos milagres e 100% de precisão em APARAR (purifica com 3 acúmulos).';
  if (profile === 'casual') return 'Casual: sessões de 8 min a cada 20 min (12 min ausente); 1 clique/s presente, Bênção até 15 s após compras, 80% dos milagres nas janelas presentes e 85% de precisão em APARAR.';
  return 'AFK: compras/prestígios a cada 12 s; Esfera e 2× manuais só nos primeiros 10 min (com clique mínimo pós-Ascensão se travar sem Fé inicial); 50% de precisão em APARAR, sem milagres manuais.';
}

/** Separate random streams keep scheduling independent from critical-click draws. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export class VisitSchedule {
  public present = true;
  public visits = 1;
  public visitStartedAtSec = 0;
  public nextTransitionSec: number;

  constructor(private behavior: Readonly<PlayerBehavior>, private random: () => number) {
    this.nextTransitionSec = behavior.initialVisitDurationSec;
  }

  public update(nowSec: number): 'arrive' | 'leave' | null {
    if (nowSec + 1e-8 < this.nextTransitionSec) return null;
    this.present = !this.present;
    if (this.present) {
      this.visits++;
      this.visitStartedAtSec = nowSec;
      this.nextTransitionSec = nowSec + this.behavior.visitDurationSec;
      return 'arrive';
    }
    this.nextTransitionSec = nowSec + this.behavior.absenceMinSec
      + (this.behavior.absenceMaxSec === this.behavior.absenceMinSec ? 0 : this.random() * (this.behavior.absenceMaxSec - this.behavior.absenceMinSec));
    return 'leave';
  }
}
