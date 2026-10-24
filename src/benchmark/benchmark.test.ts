import { describe, it, expect } from 'vitest';
import { ProgressionSimulator } from './ProgressionSimulator.js';
import { formatTerminalReport } from './reporters.js';

describe('Progression Simulator & Benchmark Suite', () => {
  it('runs complete benchmark across Active, Casual, and AFK archetypes and defeats the final boss Tiamat with ~30m intervals', () => {
    const report = ProgressionSimulator.runFullBenchmark();

    const formatted = formatTerminalReport(report);
    console.log(formatted);

    for (const arch of ['active', 'casual', 'afk'] as const) {
      const res = report.results[arch];
      expect(res.gnoseUpgradesBought).toBe(20);
      expect(res.bossesDefeated).toBe(4);
      expect(res.deadZones.length).toBe(0);
      expect(res.summaryScore).toBe('Excelente');
    }

    // Verify boss intervals are around ~30 minutes (±10m tolerance across Active & Casual)
    for (const arch of ['active', 'casual'] as const) {
      const m = report.results[arch].milestones;
      const gnose0 = m.find((x) => x.id === 'first_gnose_upgrade')?.gameTimeSec ?? 0;
      const b1 = m.find((x) => x.id === 'boss_anubis')?.gameTimeSec ?? 0;
      const b2 = m.find((x) => x.id === 'boss_cronos')?.gameTimeSec ?? 0;
      const b3 = m.find((x) => x.id === 'boss_odin')?.gameTimeSec ?? 0;
      const b4 = m.find((x) => x.id === 'boss_tiamat')?.gameTimeSec ?? 0;

      const d1Min = (b1 - gnose0) / 60;
      const d2Min = (b2 - b1) / 60;
      const d3Min = (b3 - b2) / 60;
      const d4Min = (b4 - b3) / 60;

      expect(d1Min).toBeGreaterThanOrEqual(24);
      expect(d1Min).toBeLessThanOrEqual(38);
      expect(d2Min).toBeGreaterThanOrEqual(24);
      expect(d2Min).toBeLessThanOrEqual(38);
      expect(d3Min).toBeGreaterThanOrEqual(24);
      expect(d3Min).toBeLessThanOrEqual(38);
      expect(d4Min).toBeGreaterThanOrEqual(24);
      expect(d4Min).toBeLessThanOrEqual(38);
    }
  });
});
