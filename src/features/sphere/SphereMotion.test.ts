import { describe, expect, it } from 'vitest';
import { SPHERE_FORMS, SphereMotion } from './SphereMotion.js';

describe('independent sphere motion', () => {
  it('randomizes active rings independently without changing angles or ring directions', () => {
    const motion = new SphereMotion();
    motion.form = SPHERE_FORMS[3];
    motion.advance(1);
    const angles = [motion.globe.angle, ...motion.rings.map(r => r.angle)];
    const values = [0.9, 0, 0.25, 0.5, 0.99];
    motion.reactToClick(() => values.shift()!);
    expect(motion.globe.target).toBe(-1);
    [0.6, 0.9, 1.2, 1.788].forEach((target, i) => expect(motion.rings[i].target).toBeCloseTo(target));
    expect([motion.globe.angle, ...motion.rings.map(r => r.angle)]).toEqual(angles);
    motion.advance(0.1);
    expect(motion.rings[0].angle).toBeGreaterThan(angles[1]);
    expect(motion.rings[1].angle).toBeLessThan(angles[2]);
  });

  it('allows the globe to keep its direction as well as reverse it, including before unlock', () => {
    const motion = new SphereMotion();
    motion.reactToClick(() => 0.1);
    expect(motion.globe.target).toBe(1);
    motion.reactToClick(() => 0.9);
    motion.advance(2);
    expect(motion.globe.speed).toBeLessThan(0);
    motion.reactToClick(() => 0.9);
    expect(motion.globe.target).toBe(-1);
    expect(motion.rings.every(r => r.target === 1)).toBe(true);
  });

  it('smoothly integrates the same motion independently of frame rate', () => {
    const a = new SphereMotion(), b = new SphereMotion();
    a.form = b.form = SPHERE_FORMS[4];
    a.reactToClick(() => 0.8); b.reactToClick(() => 0.8);
    a.advance(1);
    for (let i = 0; i < 100; i++) b.advance(0.01);
    expect(a.globe.angle).toBeCloseTo(b.globe.angle, 10);
    a.rings.forEach((r, i) => expect(r.angle).toBeCloseTo(b.rings[i].angle, 10));
    const angle = a.rings[0].angle;
    a.form = SPHERE_FORMS[1];
    expect(a.rings[0].angle).toBe(angle);
  });
});
