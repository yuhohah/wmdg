import { BLESSING_MAX_SECONDS } from '../../config/incarnation.js';
import { FOLLOWER_SPOTS } from './churchConfig.js';
import { CHURCH_DETAILS, type ChurchDetail } from '../../config/church.js';

/** The slice of game state the church screen is derived from. Nothing here is saved separately. */
export interface ChurchSnapshot {
  selos: { incarnation: boolean; fervor: boolean; relics: boolean };
  /** Defaults to 1 even before the Selo da Encarnação, so it never decides the scene on its own. */
  incarnationStage: number;
  followers: number;
  blessingSeconds: number;
}

export type ChurchTier = 0 | 1 | 2 | 3;
/** A tier reached by restoring the ruin, i.e. every tier but the starting one. */
export type RestoredTier = Exclude<ChurchTier, 0>;
export type SphereLocation = 'ruins' | 'altar';
/** 0 is O Escolhido; 1–5 are O Profeta at each Encarnação stage. */
export type ProtagonistLook = 0 | 1 | 2 | 3 | 4 | 5;
export type ProfetaLook = Exclude<ProtagonistLook, 0>;
export type ProtagonistLabel = 'O Escolhido' | 'O Profeta';
/** One drawn look per Encarnação stage; a later stage keeps the last look until it gets art of its own. */
const LAST_PROFETA_LOOK: ProfetaLook = 5;

export interface ChurchSceneDescription {
  tier: ChurchTier;
  sphereLocation: SphereLocation;
  /** Props unlocked by the follower count, in threshold order. */
  details: ChurchDetail[];
  protagonist: { look: ProtagonistLook; label: ProtagonistLabel };
  /** The Bênção button under the Esfera; `fill` is the stored 2× time as a 0–1 fraction of the cap. */
  blessing: { visible: boolean; fill: number };
  /** How many of the church-yard spots hold a follower, filled in `FOLLOWER_SPOTS` order. */
  filledSpots: number;
}

export type ChurchSceneChange =
  | { kind: 'tier'; from: ChurchTier; to: ChurchTier }
  | { kind: 'detail'; detail: ChurchDetail }
  | { kind: 'look'; from: ProtagonistLook; to: ProtagonistLook };

export function describeChurchScene(snapshot: ChurchSnapshot): ChurchSceneDescription {
  // Each Selo requires the previous one, so only an unbroken run from the first counts.
  const { incarnation, fervor, relics } = snapshot.selos;
  const tier: ChurchTier = !incarnation ? 0 : !fervor ? 1 : !relics ? 2 : 3;
  return {
    tier,
    sphereLocation: tier === 0 ? 'ruins' : 'altar',
    details: CHURCH_DETAILS.filter(({ followers }) => snapshot.followers >= followers).map(({ detail }) => detail),
    protagonist: describeProtagonist(incarnation, snapshot.incarnationStage),
    blessing: {
      visible: incarnation,
      fill: Math.min(1, Math.max(0, snapshot.blessingSeconds / BLESSING_MAX_SECONDS))
    },
    filledSpots: Math.min(Math.floor(snapshot.followers), FOLLOWER_SPOTS.length)
  };
}

/** The stage reads 1 before the Selo too, so the Selo alone decides when O Escolhido becomes O Profeta. */
export function describeProtagonist(incarnationUnlocked: boolean, incarnationStage: number): ChurchSceneDescription['protagonist'] {
  if (!incarnationUnlocked) return { look: 0, label: 'O Escolhido' };
  return { look: Math.min(LAST_PROFETA_LOOK, Math.max(1, Math.floor(incarnationStage))) as ProfetaLook, label: 'O Profeta' };
}

/** What changed between two descriptions; the renderer turns each change into a transition and notification. */
export function compareChurchScenes(previous: ChurchSceneDescription, next: ChurchSceneDescription): ChurchSceneChange[] {
  const changes: ChurchSceneChange[] = [];
  if (previous.tier !== next.tier) changes.push({ kind: 'tier', from: previous.tier, to: next.tier });
  for (const detail of next.details) {
    if (!previous.details.includes(detail)) changes.push({ kind: 'detail', detail });
  }
  const { look: from } = previous.protagonist;
  const { look: to } = next.protagonist;
  if (from !== to) changes.push({ kind: 'look', from, to });
  return changes;
}
