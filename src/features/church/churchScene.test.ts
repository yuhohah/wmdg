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
    expect(describeChurchScene(start)).toMatchObject({ tier: 0, sphereLocation: 'ruins' });
  });

  it('stays a ruin regardless of followers and Encarnação stage while the Selo is sealed', () => {
    expect(describeChurchScene({ ...start, incarnationStage: 3, followers: 500, blessingSeconds: 40 }))
      .toMatchObject({ tier: 0, sphereLocation: 'ruins' });
  });

  it('clears the rubble and puts the Esfera on the altar once the Selo da Encarnação is broken', () => {
    const scene = describeChurchScene({ ...start, selos: { ...start.selos, incarnation: true } });
    expect(scene).toMatchObject({ tier: 1, sphereLocation: 'altar' });
  });

  it('hides the Bênção button until the Selo da Encarnação, even with stored seconds', () => {
    expect(describeChurchScene({ ...start, blessingSeconds: 30 }).blessing.visible).toBe(false);
  });

  it('shows the Bênção button once the Selo da Encarnação is broken', () => {
    expect(describeChurchScene({ ...start, selos: { ...start.selos, incarnation: true } }).blessing.visible).toBe(true);
  });

  it.each([
    [0, 0],
    [15, 0.25],
    [34, 34 / 60],
    [60, 1],
    [75, 1],
    [-5, 0]
  ])('fills the Bênção button to %ss / 60 = %s, clamped to 0–1', (blessingSeconds, fill) => {
    const scene = describeChurchScene({ ...start, selos: { ...start.selos, incarnation: true }, blessingSeconds });
    expect(scene.blessing.fill).toBeCloseTo(fill);
  });
});
