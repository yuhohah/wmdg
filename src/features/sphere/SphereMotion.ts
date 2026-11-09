const TAU = Math.PI * 2;
const ASSETS = `${import.meta.env.BASE_URL}assets/sphere/progression/`;
export const SPHERE_FORMS = [
  { id: 'nucleo', source: 'nucleo.png', size: 512, rings: 0 },
  { id: 'meridiano', source: 'engraved-globe.png', size: 512, rings: 1 },
  { id: 'equador', source: 'engraved-globe.png', size: 512, rings: 2 },
  { id: 'orbitas', source: 'meridian-globe.png', size: 300, rings: 4 },
  { id: 'plenitude', source: 'hollow-globe.png', size: 332.8, rings: 4 },
].map(form => ({ ...form, source: ASSETS + form.source }));
export type SphereForm = typeof SPHERE_FORMS[number];
export function sphereFormForProgress(unlocked: boolean, stage: number): SphereForm {
  return SPHERE_FORMS[unlocked ? Math.min(4, Math.max(1, Number.isFinite(stage) ? Math.floor(stage) : 1)) : 0];
}
export const RINGS = [
  { radius: 174, beta: 90, phase: 73, tilt: -10, period: 12, direction: 1, pitch: false },
  { radius: 150, beta: 12, phase: 0, tilt: 0, period: 16, direction: -1, pitch: false },
  { radius: 199, beta: 30, phase: 0, tilt: 35, period: 24, direction: 1, pitch: false },
  { radius: 222, beta: 90, phase: 0, tilt: 0, period: 24, direction: 1, pitch: true },
];
function rotor() { return { angle: 0, speed: 1, target: 1 }; }
/** Cosmetic motion is independent of gameplay and persists across clicks/form changes. */
export class SphereMotion {
  form = SPHERE_FORMS[0];
  readonly globe = rotor();
  readonly rings = RINGS.map(rotor);

  reactToClick(random: () => number = Math.random): void {
    this.globe.target = random() < 0.5 ? 1 : -1;
    for (let i = 0; i < this.form.rings; i++) this.rings[i].target = 0.6 + random() * 1.2;
  }

  advance(seconds: number): void {
    const integrate = (state: ReturnType<typeof rotor>, velocity: number) => {
      const decay = Math.exp(-seconds / 0.25);
      const travel = state.target * seconds + (state.speed - state.target) * 0.25 * (1 - decay);
      state.angle = (state.angle + velocity * travel) % TAU;
      state.speed = state.target + (state.speed - state.target) * decay;
    };
    integrate(this.globe, TAU / 24);
    for (let i = 0; i < this.form.rings; i++) {
      const spec = RINGS[i];
      const period = this.form.rings <= 2 ? 8 : spec.period;
      integrate(this.rings[i], spec.direction * TAU / period);
    }
  }
}

export function ringPoint(index: number, angle: number, rotation: number, form: SphereForm): number[] {
  const spec = RINGS[index];
  const beta = spec.beta * Math.PI / 180 + (spec.pitch ? rotation : 0);
  const phi = spec.phase * Math.PI / 180 + (spec.pitch ? 0 : rotation);
  const tilt = spec.tilt * Math.PI / 180;
  const radius = form.id === 'equador' && index === 1 ? 148 : spec.radius;
  const x = radius * Math.cos(angle), y = radius * Math.sin(angle) * Math.sin(beta);
  const z = radius * Math.sin(angle) * Math.cos(beta);
  const xx = x * Math.cos(phi) + z * Math.sin(phi);
  const zz = -x * Math.sin(phi) + z * Math.cos(phi);
  return [256 + xx * Math.cos(tilt) - y * Math.sin(tilt), 256 - xx * Math.sin(tilt) - y * Math.cos(tilt), zz];
}
