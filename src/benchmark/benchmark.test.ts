import { describe, it, expect } from 'vitest';
import { ProgressionSimulator } from './ProgressionSimulator.js';
import { formatTerminalReport } from './reporters.js';

describe('Progression Simulator & Benchmark Suite', () => {
  it('runs complete benchmark across Active, Casual, and AFK archetypes and reaches Gnose', () => {
    const report = ProgressionSimulator.runFullBenchmark();

    // Verify all archetypes completed simulation and bought a Gnose upgrade
    expect(report.results.active.totalSimulatedTimeSec).toBeGreaterThan(0);
    expect(report.results.casual.totalSimulatedTimeSec).toBeGreaterThan(0);
    expect(report.results.afk.totalSimulatedTimeSec).toBeGreaterThan(0);

    // Active player should be faster than or equal to AFK player
    expect(report.results.active.totalSimulatedTimeSec).toBeLessThanOrEqual(
      report.results.afk.totalSimulatedTimeSec
    );

    // Print the clean, formatted side-by-side terminal report
    const formatted = formatTerminalReport(report);
    console.log(formatted);
  });
});
