import { describe, expect, it } from 'vitest';
import { compareChurchScenes, describeChurchScene, type ChurchSnapshot } from './churchScene.js';

const start: ChurchSnapshot = {
  selos: { incarnation: false, fervor: false, relics: false },
  incarnationStage: 1,
  followers: 0,
  blessingSeconds: 0
};

const withSelos = (incarnation: boolean, fervor: boolean, relics: boolean): ChurchSnapshot =>
  ({ ...start, selos: { incarnation, fervor, relics } });

describe('church scene description', () => {
  it('shows the ruin with the Esfera among the rubble before the Selo da Encarnação', () => {
    expect(describeChurchScene(start)).toMatchObject({ tier: 0, sphereLocation: 'ruins' });
  });

  it('stays a ruin regardless of followers and Encarnação stage while the Selo is sealed', () => {
    expect(describeChurchScene({ ...start, incarnationStage: 3, followers: 500, blessingSeconds: 40 }))
      .toMatchObject({ tier: 0, sphereLocation: 'ruins' });
  });

  it('clears the rubble and puts the Esfera on the altar once the Selo da Encarnação is broken', () => {
    expect(describeChurchScene(withSelos(true, false, false))).toMatchObject({ tier: 1, sphereLocation: 'altar' });
  });

  it('repairs the roof and walls with the Selo do Fervor', () => {
    expect(describeChurchScene(withSelos(true, true, false))).toMatchObject({ tier: 2, sphereLocation: 'altar' });
  });

  it('fully restores the church with the Selo das Relíquias', () => {
    expect(describeChurchScene(withSelos(true, true, true))).toMatchObject({ tier: 3, sphereLocation: 'altar' });
  });

  it('counts only Selos broken in order, so a later Selo cannot skip an earlier one', () => {
    expect(describeChurchScene(withSelos(true, false, true)).tier).toBe(1);
    expect(describeChurchScene(withSelos(false, true, true)).tier).toBe(0);
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
  it.each([
    [0, 0],
    [1, 1],
    [11, 11],
    [12, 12],
    [13, 12],
    [10_000, 12]
  ])('fills min(followers, 12) church-yard spots: %i followers fill %i', (followers, filledSpots) => {
    expect(describeChurchScene({ ...start, followers }).filledSpots).toBe(filledSpots);
  });

  it('fills only whole spots for a fractional follower count', () => {
    expect(describeChurchScene({ ...start, followers: 2.7 }).filledSpots).toBe(2);
  });
});

describe('church scene comparison', () => {
  const scene = (incarnation: boolean, fervor: boolean, relics: boolean) => describeChurchScene(withSelos(incarnation, fervor, relics));

  it('reports nothing when nothing changed', () => {
    expect(compareChurchScenes(scene(true, true, false), scene(true, true, false))).toEqual([]);
  });

  it('reports nothing when only state outside the scene changed', () => {
    const before = describeChurchScene({ ...withSelos(true, false, false), followers: 3 });
    const after = describeChurchScene({ ...withSelos(true, false, false), followers: 4, blessingSeconds: 12 });
    expect(compareChurchScenes(before, after)).toEqual([]);
  });

  it.each([
    [scene(false, false, false), scene(true, false, false), 0, 1],
    [scene(true, false, false), scene(true, true, false), 1, 2],
    [scene(true, true, false), scene(true, true, true), 2, 3]
  ])('reports exactly the tier change when a Selo is broken (%#)', (previous, next, from, to) => {
    expect(compareChurchScenes(previous, next)).toEqual([{ kind: 'tier', from, to }]);
  });
});
