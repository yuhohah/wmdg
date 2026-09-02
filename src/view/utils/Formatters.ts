export class Formatters {
  /**
   * Format numbers:
   * - Up to 999 999 999: formatted standard numbers (e.g. 1 500, 250 000, 999 999 999)
   * - From 1 000 000 000 (10^9) upwards: scientific notation (e.g. 1e9, 1.2e9, 9.9e9, 1e10, 1.5e10)
   */
  public static formatNumber(num: number, allowDecimals: boolean = false): string {
    if (isNaN(num) || !isFinite(num)) return '0';
    if (num < 0) return '-' + this.formatNumber(-num, allowDecimals);

    // Below 1 billion (999 999 999 max before scientific notation)
    if (num < 1e9) {
      if (num < 1000) {
        // For rates or explicit decimal formatting, show 1 decimal place if not whole
        if (allowDecimals) {
          if (Math.abs(num - Math.round(num)) < 0.05) {
            return Math.round(num).toString();
          }
          return num.toFixed(1);
        }
        return Math.floor(num).toString();
      }

      // Format with spaces as thousand separators (e.g. 1 000, 250 000, 999 999 999)
      const integerPart = Math.floor(num);
      return integerPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    // Scientific notation for 10^9 and above: 1e9 to 9.9e9, 1e10, etc.
    const exponent = Math.floor(Math.log10(num));
    const mantissa = num / Math.pow(10, exponent);

    // Round mantissa to 1 decimal place
    const roundedMantissa = Math.round(mantissa * 10) / 10;

    // Handle edge case where rounding 9.95 yields 10
    if (roundedMantissa >= 10) {
      return `1e${exponent + 1}`;
    }

    const formattedMantissa = roundedMantissa.toFixed(1).replace(/\.0$/, '');
    return `${formattedMantissa}e${exponent}`;
  }

  /**
   * Format rate per second
   */
  public static formatRate(num: number): string {
    return `+${this.formatNumber(num, true)}/s`;
  }

  /**
   * Format elapsed seconds into human readable time
   */
  public static formatDuration(seconds: number): string {
    const s = Math.floor(seconds % 60);
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / 3600);

    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  }
}
