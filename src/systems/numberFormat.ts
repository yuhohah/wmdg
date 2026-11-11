const UNITS = ['', 'K', 'M', 'B', 'T'];

/** Brazilian notation shared by resource balances, costs and multipliers: 1,5K … 250T, then 1e15. */
export function formatNumber(value: number, significantDigits = 3): string {
  if (!Number.isFinite(value) || value === 0) return '0';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  let scaled = abs;
  let unit = 0;
  while (scaled >= 1000 && unit < UNITS.length - 1) {
    scaled /= 1000;
    unit++;
  }
  let rounded = Number(scaled.toPrecision(significantDigits));
  // Rounding can reach the next unit: 999.999 must read 1M, never 1000K.
  if (rounded >= 1000 && unit < UNITS.length - 1) {
    unit++;
    rounded = Number((scaled / 1000).toPrecision(significantDigits));
  }
  if (rounded < 1000 && (unit > 0 || rounded >= 1e-3)) {
    return `${sign}${comma(rounded)}${UNITS[unit]}`;
  }
  const [mantissa, exponent] = abs.toExponential(significantDigits - 1).split('e');
  // Number removes insignificant zeros and the exponent's optional plus sign.
  return `${sign}${comma(Number(mantissa))}e${Number(exponent)}`;
}

/** toFixed with the Brazilian decimal comma, for times and percentages. */
export function formatFixed(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', ',');
}

function comma(value: number): string {
  return String(value).replace('.', ',');
}
