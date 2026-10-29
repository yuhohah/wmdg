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
  blessingTargetSec: number;
  blessingMode: 'maintain' | 'after_purchase';
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

const INTENSE_BEHAVIOR: Readonly<PlayerBehavior> = {
    name: 'Ativo (presença contínua)', initialClickCps: 5, routineClickCps: 2,
    combatClickCps: 5, maxInteractionCps: 5, decisionDelaySec: 3,
    miracleCatchChance: 0.95, miracleResponseSec: 1, riftResponseSec: 0.3,
    blessingTargetSec: 60, blessingMode: 'maintain', sphereManualUntilSec: Infinity, postGnoseRecoveryClicks: false, blessingManualUntilSec: Infinity,
    routineBurstEverySec: Infinity, routineBurstDurationSec: Infinity,
    initialVisitDurationSec: Infinity, visitDurationSec: Infinity, absenceMinSec: 0, absenceMaxSec: 0,
  };

/** Hypothesis for the campaign acceptance suite; intense active remains unchanged. */
export const REFERENCE_BEHAVIOR: Readonly<PlayerBehavior> = {
  ...INTENSE_BEHAVIOR, name: 'Ativo de referência', initialClickCps: 2,
  routineClickCps: 2, routineBurstEverySec: 60, routineBurstDurationSec: 10,
  miracleCatchChance: 0.7,
};

export const PLAYER_BEHAVIORS: Record<PlayerArchetype, Readonly<PlayerBehavior>> = {
  reference: REFERENCE_BEHAVIOR,
  active: INTENSE_BEHAVIOR,
  casual: {
    name: 'Casual (8 min de jogo a cada 20 min)', initialClickCps: 2, routineClickCps: 1,
    combatClickCps: 3.5, maxInteractionCps: 3.5, decisionDelaySec: 5,
    miracleCatchChance: 0.4, miracleResponseSec: 3, riftResponseSec: 0.8,
    blessingTargetSec: 6, blessingMode: 'maintain', sphereManualUntilSec: Infinity, postGnoseRecoveryClicks: false, blessingManualUntilSec: Infinity,
    routineBurstEverySec: Infinity, routineBurstDurationSec: Infinity,
    // Sessions start at 0, 20, 40… minutes: 8 minutes present, then 12 away.
    initialVisitDurationSec: 480, visitDurationSec: 480, absenceMinSec: 720, absenceMaxSec: 720,
  },
  afk: {
    name: 'AFK (10 min ativos e recuperação após Gnose)', initialClickCps: 2, routineClickCps: 1,
    combatClickCps: 1, maxInteractionCps: 2, decisionDelaySec: 2,
    miracleCatchChance: 0, miracleResponseSec: 0, riftResponseSec: Infinity,
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
  const phase = (nowSec - visitStartedAt + 1e-8) % behavior.routineBurstEverySec;
  return manualSphereAllowed(behavior, nowSec) && phase < behavior.routineBurstDurationSec;
}

export function describeBehavior(profile: PlayerArchetype): string {
  if (profile === 'reference') return 'Referência: 2 cliques/s em rajadas de 10 s por minuto, 70% dos milagres e orçamento compartilhado de compras, Bênção e combate.';
  if (profile === 'active') return 'Ativo: presença contínua, cliques rotineiros e manutenção manual do 2×.';
  if (profile === 'casual') return 'Casual: sessões de 8 min a cada 20 min (12 min ausente); cliques contínuos a 1/s durante a presença, compras/prestígios e manutenção manual do 2× até 6 s de carga.';
  return 'AFK: compras e prestígios contínuos; cliques na Esfera e ativação manual do 2× antes dos 10 min de tempo total; após Gnose, permite apenas cliques de recuperação até haver Fé para o primeiro fiel, sem reativar o 2× manual.';
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
