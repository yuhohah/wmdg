import { describe, expect, it } from 'vitest';
import { describeChurchScene, type ChurchSnapshot } from './churchScene.js';

const start: ChurchSnapshot = {
  selos: { incarnation: false, fervor: false, relics: false },
  incarnationStage: 1,
  followers: 0,
  blessingSeconds: 0
};

describe('church scene description', () => {
  it('shows the ruin with the Esfera among the rubble before the Selo da Encarnação', () => {
    expect(describeChurchScene(start)).toEqual({ tier: 0, sphereLocation: 'ruins' });
  });

  it('stays a ruin regardless of followers and Encarnação stage while the Selo is sealed', () => {
    expect(describeChurchScene({ ...start, incarnationStage: 3, followers: 500, blessingSeconds: 40 }))
      .toEqual({ tier: 0, sphereLocation: 'ruins' });
  });

  it('clears the rubble and puts the Esfera on the altar once the Selo da Encarnação is broken', () => {
    const scene = describeChurchScene({ ...start, selos: { ...start.selos, incarnation: true } });
    expect(scene).toEqual({ tier: 1, sphereLocation: 'altar' });
  });
});
