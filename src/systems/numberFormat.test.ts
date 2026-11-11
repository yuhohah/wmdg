import { describe, expect, it } from 'vitest';
import { formatNumber } from './calculations.js';
import { formatFixed } from './numberFormat.js';
import { formatCompactNumber } from '../benchmark/reporters.js';

describe('Brazilian resource notation', () => {
  it.each([
    [0, '0'], [-0, '0'], [1, '1'], [3, '3'], [1.5, '1,5'], [4.92, '4,92'],
    [0.05, '0,05'], [9.999e-4, '0,001'], [20, '20'], [999, '999'],
    [999.99, '1K'], [1000, '1K'], [1500, '1,5K'], [28200, '28,2K'], [-1250, '-1,25K'],
    [425000, '425K'], [999_499, '999K'], [999_999, '1M'], [2.5e6, '2,5M'], [2e7, '20M'],
    [2.02e9, '2,02B'], [2.5e11, '250B'], [1e12, '1T'], [2.5e14, '250T'],
    [999.95e12, '1e15'], [1e15, '1e15'], [6.25e17, '6,25e17'], [1e100, '1e100'],
    [Number.MIN_VALUE, '4,94e-324'], [Number.MAX_VALUE, '1,8e308'],
    [NaN, '0'], [Infinity, '0'], [-Infinity, '0'],
  ])('formats %s as %s consistently in the game and reports', (value, expected) => {
    expect(formatNumber(value)).toBe(expected);
    expect(formatCompactNumber(value)).toBe(expected);
  });

  it('preserves extra precision for formula coefficients', () => {
    expect(formatNumber(1.23456789123, 12)).toBe('1,23456789123');
  });

  it('writes fixed decimals for times and percentages with a comma', () => {
    expect(formatFixed(77.84, 1)).toBe('77,8');
    expect(formatFixed(12, 1)).toBe('12,0');
  });
});
