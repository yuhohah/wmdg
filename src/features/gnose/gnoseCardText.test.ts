import { describe, expect, it } from 'vitest';
import { calculateFaithForNextGnose } from '../../systems/calculations.js';
import type { BossCombatBreakdown } from '../../types.js';
import { ascensionHint, guardianRequirement, readinessLine } from './GnoseTab.js';

const Q = 1e15;

describe('Faith needed for the next Gnose', () => {
  it.each([
    [0.5 * Q, 0.25, 1 * Q],
    [1 * Q, 0.25, 16 * Q],
    [16 * Q, 0.25, 81 * Q],
    [317.2 * Q, 0.25, 625 * Q],
    [317.2 * Q, 0.28, 601.3 * Q],
  ])('from %d Faith with exponent %d needs %d', (faith, exponent, expected) => {
    expect(calculateFaithForNextGnose(faith, exponent) / expected).toBeCloseTo(1, 3);
  });
});

describe('Ascension hint', () => {
  it('points to the first Ascension below the threshold', () => {
    expect(ascensionHint(5e14, 0.25)).toBe('Ascensão com 1e15 de Fé (você tem 500T)');
  });

  it('points to the next Gnose once Ascension is available', () => {
    expect(ascensionHint(317.2 * Q, 0.25)).toBe('Próxima Gnose com 6,25e17 de Fé (você tem 3,17e17)');
  });
});

describe('Guardian readiness line', () => {
  const breakdown = (cultReadiness: number, canDamageBoss: boolean, canWithstandBoss: boolean, labels: string[]) => ({
    cultReadiness, canDamageBoss, canWithstandBoss, weakPillars: labels.map(label => ({ label })),
  }) as unknown as BossCombatBreakdown;

  it('warns when the cult cannot deal damage and lists what to strengthen', () => {
    expect(readinessLine(breakdown(0.45, false, false, ['Fiéis', 'Fervor', 'Relíquias'])))
      .toBe('Prontidão 45%: você ainda não causa dano.\nFortaleça: Fiéis, Fervor e Relíquias.');
  });

  it('warns about unparried blows between the damage and defense limits', () => {
    expect(readinessLine(breakdown(0.7, true, false, ['Fé'])))
      .toBe('Prontidão 70%: um golpe não aparado destrói a Esfera.\nFortaleça: Fé.');
  });

  it('confirms a prepared cult with nothing else to strengthen', () => {
    expect(readinessLine(breakdown(0.9, true, true, []))).toBe('Prontidão 90%: culto preparado.');
  });

  it('names at most three pillars', () => {
    expect(readinessLine(breakdown(0.85, true, true, ['A', 'B', 'C', 'D'])))
      .toBe('Prontidão 85%: culto preparado.\nFortaleça: A, B e C.');
  });
});

describe('Guardian requirement', () => {
  it('asks only for the victory when the Guardian can be challenged', () => {
    expect(guardianRequirement(2, true, 0)).toBe('Vença para liberar estes nós.');
    expect(guardianRequirement(3, true, 2)).toBe('Vença para liberar estes nós.');
  });

  it('shows the nodes missing from the previous tier', () => {
    expect(guardianRequirement(3, false, 0)).toBe('Assimile 2 nós do Tier II (0/2)');
    expect(guardianRequirement(4, false, 1)).toBe('Assimile 2 nós do Tier III (1/2)');
  });
});
