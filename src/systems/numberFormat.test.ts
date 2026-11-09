import { describe, expect, it } from 'vitest';
import { formatNumber } from './calculations.js';
import { formatCompactNumber } from '../benchmark/reporters.js';

describe('scientific resource notation', () => {
  it.each([
    [0, '0e0'], [-0, '0e0'], [1, '1e0'], [3, '3e0'], [1.5, '1.5e0'],
    [0.05, '5e-2'], [-1250, '-1.25e3'], [1000, '1e3'],
    [1e6, '1e6'], [1e9, '1e9'], [1e12, '1e12'], [1e15, '1e15'],
    [1e18, '1e18'], [1e100, '1e100'], [999.99, '1e3'], [9.999e-4, '1e-3'],
    [Number.MIN_VALUE, '4.94e-324'], [Number.MAX_VALUE, '1.8e308'],
    [NaN, '0e0'], [Infinity, '0e0'], [-Infinity, '0e0'],
  ])('formats %s as %s consistently in the game and reports', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
    expect(formatCompactNumber(value)).toBe(expected);
  });

  it('preserves extra precision for formula coefficients', () => {
    expect(formatNumber(1.23456789123, 12)).toBe('1.23456789123e0');
  });
});
