import { BLESSING_MAX_SECONDS } from '../../config/incarnation.js';

/** The slice of game state the church screen is derived from. Nothing here is saved separately. */
export interface ChurchSnapshot {
  selos: { incarnation: boolean; fervor: boolean; relics: boolean };
  /** Defaults to 1 even before the Selo da Encarnação, so it never decides the scene on its own. */
  incarnationStage: number;
  followers: number;
  blessingSeconds: number;
}

export type ChurchTier = 0 | 1;
export type SphereLocation = 'ruins' | 'altar';

export interface ChurchSceneDescription {
  tier: ChurchTier;
  sphereLocation: SphereLocation;
  /** The Bênção button under the Esfera; `fill` is the stored 2× time as a 0–1 fraction of the cap. */
  blessing: { visible: boolean; fill: number };
}

export function describeChurchScene(snapshot: ChurchSnapshot): ChurchSceneDescription {
  const tier: ChurchTier = snapshot.selos.incarnation ? 1 : 0;
  return {
    tier,
    sphereLocation: tier === 0 ? 'ruins' : 'altar',
    blessing: {
      visible: snapshot.selos.incarnation,
      fill: Math.min(1, Math.max(0, snapshot.blessingSeconds / BLESSING_MAX_SECONDS))
    }
  };
}
