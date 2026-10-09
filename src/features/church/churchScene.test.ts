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

  it('has no details with no followers', () => {
    expect(describeChurchScene(start).details).toEqual([]);
  });

  it.each([
    [10, 'torches'],
    [25, 'pews'],
    [50, 'garden'],
    [100, 'banner'],
    [250, 'statue']
  ] as const)('unlocks the detail at %s followers (%s), not one below', (followers, detail) => {
    expect(describeChurchScene({ ...start, followers }).details).toContain(detail);
    expect(describeChurchScene({ ...start, followers: followers - 1 }).details).not.toContain(detail);
  });

  it('keeps every earlier detail as followers grow', () => {
    expect(describeChurchScene({ ...start, followers: 100 }).details).toEqual(['torches', 'pews', 'garden', 'banner']);
    expect(describeChurchScene({ ...start, followers: 1e6 }).details).toEqual(['torches', 'pews', 'garden', 'banner', 'statue']);
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

  it.each([
    [0, 0],
    [12, 0],
    [49, 0],
    [50, 1],
    [249, 1],
    [250, 2],
    [999, 2],
    [1_000, 3],
    [9_999, 3],
    [10_000, 4]
  ])('gathers a crowd behind the yard: %i followers draw crowd level %i', (followers, crowdLevel) => {
    expect(describeChurchScene({ ...start, followers }).crowdLevel).toBe(crowdLevel);
  });

  it('caps the crowd at the top level however many followers there are', () => {
    expect(describeChurchScene({ ...start, followers: 1e300 }).crowdLevel).toBe(4);
    expect(describeChurchScene({ ...start, followers: Infinity }).crowdLevel).toBe(4);
  });

  it('gathers the crowd regardless of the church tier', () => {
    expect(describeChurchScene({ ...withSelos(true, true, true), followers: 250 }).crowdLevel).toBe(2);
  });
});

describe('protagonist', () => {
  it('is O Escolhido (look 0) before the Selo da Encarnação, even though the Encarnação stage reads 1', () => {
    expect(describeChurchScene(start).protagonist).toEqual({ look: 0 });
  });

  it('stays O Escolhido before the Selo whatever the Encarnação stage reads', () => {
    expect(describeChurchScene({ ...start, incarnationStage: 4 }).protagonist).toEqual({ look: 0 });
  });

  it.each([1, 2, 3, 4, 5])('is O Profeta with the matching look at Encarnação stage %i once the Selo is broken', stage => {
    expect(describeChurchScene({ ...withSelos(true, false, false), incarnationStage: stage }).protagonist)
      .toEqual({ look: stage });
  });
});

describe('church scene comparison', () => {
  const scene = (incarnation: boolean, fervor: boolean, relics: boolean) => describeChurchScene(withSelos(incarnation, fervor, relics));

  it('reports nothing when nothing changed', () => {
    expect(compareChurchScenes(scene(true, true, false), scene(true, true, false))).toEqual([]);
  });

  it('reports nothing when only state outside the scene changed', () => {
    const before = describeChurchScene({ ...withSelos(true, false, false), followers: 11 });
    const after = describeChurchScene({ ...withSelos(true, false, false), followers: 24, blessingSeconds: 12 });
    expect(compareChurchScenes(before, after)).toEqual([]);
  });

  it('reports the tier change and O Escolhido becoming O Profeta when the Selo da Encarnação is broken', () => {
    expect(compareChurchScenes(scene(false, false, false), scene(true, false, false))).toEqual([
      { kind: 'tier', from: 0, to: 1 },
      { kind: 'look', from: 0, to: 1 }
    ]);
  });

  it.each([1, 2, 3, 4])('reports exactly the look change when the Encarnação advances from stage %i', stage => {
    const at = (incarnationStage: number) => describeChurchScene({ ...withSelos(true, false, false), incarnationStage });
    expect(compareChurchScenes(at(stage), at(stage + 1))).toEqual([{ kind: 'look', from: stage, to: stage + 1 }]);
  });

  it.each([
    [scene(true, false, false), scene(true, true, false), 1, 2],
    [scene(true, true, false), scene(true, true, true), 2, 3]
  ])('reports exactly the tier change when a Selo is broken (%#)', (previous, next, from, to) => {
    expect(compareChurchScenes(previous, next)).toEqual([{ kind: 'tier', from, to }]);
  });

  it('reports the detail unlocked when followers cross its threshold', () => {
    const before = describeChurchScene({ ...start, followers: 9 });
    const after = describeChurchScene({ ...start, followers: 10 });
    expect(compareChurchScenes(before, after)).toEqual([{ kind: 'detail', detail: 'torches' }]);
  });

  it('reports every detail unlocked at once, in threshold order', () => {
    const before = describeChurchScene({ ...start, followers: 20 });
    const after = describeChurchScene({ ...start, followers: 120 });
    expect(compareChurchScenes(before, after)).toEqual([
      { kind: 'detail', detail: 'pews' },
      { kind: 'detail', detail: 'garden' },
      { kind: 'detail', detail: 'banner' }
    ]);
  });

  it('reports nothing when followers drop below a threshold', () => {
    const before = describeChurchScene({ ...start, followers: 30 });
    const after = describeChurchScene({ ...start, followers: 5 });
    expect(compareChurchScenes(before, after)).toEqual([]);
  });

  it('reports a tier change and a new detail together', () => {
    const before = describeChurchScene({ ...withSelos(true, false, false), followers: 49 });
    const after = describeChurchScene({ ...withSelos(true, true, false), followers: 50 });
    expect(compareChurchScenes(before, after)).toEqual([
      { kind: 'tier', from: 1, to: 2 },
      { kind: 'detail', detail: 'garden' }
    ]);
  });
});
