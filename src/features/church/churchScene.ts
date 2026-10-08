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

export interface ChurchSceneDescription {
  tier: ChurchTier;
  sphereLocation: SphereLocation;
  /** Props unlocked by the follower count, in threshold order. */
  details: ChurchDetail[];
  /** The Bênção button under the Esfera; `fill` is the stored 2× time as a 0–1 fraction of the cap. */
  blessing: { visible: boolean; fill: number };
  /** How many of the church-yard spots hold a follower, filled in `FOLLOWER_SPOTS` order. */
  filledSpots: number;
}

export type ChurchSceneChange =
  | { kind: 'tier'; from: ChurchTier; to: ChurchTier }
  | { kind: 'detail'; detail: ChurchDetail };

export function describeChurchScene(snapshot: ChurchSnapshot): ChurchSceneDescription {
  // Each Selo requires the previous one, so only an unbroken run from the first counts.
  const { incarnation, fervor, relics } = snapshot.selos;
  const tier: ChurchTier = !incarnation ? 0 : !fervor ? 1 : !relics ? 2 : 3;
  return {
    tier,
    sphereLocation: tier === 0 ? 'ruins' : 'altar',
    details: CHURCH_DETAILS.filter(({ followers }) => snapshot.followers >= followers).map(({ detail }) => detail),
    blessing: {
      visible: incarnation,
      fill: Math.min(1, Math.max(0, snapshot.blessingSeconds / BLESSING_MAX_SECONDS))
    },
    filledSpots: Math.min(Math.floor(snapshot.followers), FOLLOWER_SPOTS.length)
  };
}

/** What changed between two descriptions; the renderer turns each change into a transition and notification. */
export function compareChurchScenes(previous: ChurchSceneDescription, next: ChurchSceneDescription): ChurchSceneChange[] {
  const changes: ChurchSceneChange[] = previous.tier === next.tier ? [] : [{ kind: 'tier', from: previous.tier, to: next.tier }];
  for (const detail of next.details) {
    if (!previous.details.includes(detail)) changes.push({ kind: 'detail', detail });
  }
  return changes;
}
