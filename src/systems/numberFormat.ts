/** Scientific notation shared by resource balances, costs and multipliers. */
export function formatNumber(value: number, significantDigits = 3): string {
  if (!Number.isFinite(value) || value === 0) return '0e0';
  const [mantissa, exponent] = value.toExponential(significantDigits - 1).split('e');
  // Number removes insignificant zeros and the exponent's optional plus sign.
  return `${Number(mantissa)}e${Number(exponent)}`;
}
