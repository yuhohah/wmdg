import type { BenchmarkReport, DeadZone } from './types.js';

export function formatDuration(seconds: number): string {
  if (seconds < 0 || !Number.isFinite(seconds)) return 'N/A';
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h < 24) return `${h}h ${remM}m`;
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return `${d}d ${remH}h`;
}

export function formatCompactNumber(num: number): string {
  if (!Number.isFinite(num) || num === 0) return '0';
  if (num < 1000) return num.toFixed(0);
  const units = ['k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const exp = Math.floor(Math.log10(Math.abs(num)) / 3);
  if (exp >= 1 && exp <= units.length) {
    const val = num / Math.pow(10, exp * 3);
    return `${val.toFixed(val < 10 ? 2 : 1)}${units[exp - 1]}`;
  }
  return num.toExponential(2);
}

export function formatTerminalReport(report: BenchmarkReport): string {
  const { active, casual, afk } = report.results;
  const divider = '═'.repeat(94);
  const thinDivider = '─'.repeat(94);

  const lines: string[] = [];
  lines.push('');
  lines.push(divider);
  lines.push('  RELATÓRIO DE PROGRESSÃO DEFINITIVO — CULT OF THE SPHERE');
  lines.push('  Curva Completa: 1º Fiel → Árvore da Gnose (20/20) → Guardiões → Chefe Final (Tiamat)');
  lines.push(divider);

  // Header Table
  lines.push(
    `  ${'MÉTRICA / MARCO'.padEnd(34)} | ${'ATIVO (Devoto)'.padEnd(16)} | ${'CASUAL (Híbrido)'.padEnd(16)} | ${'AFK (Ocioso)'.padEnd(16)}`
  );
  lines.push(thinDivider);

  // Extract common milestone names
  const allMilestoneIds = [
    { id: 'first_follower', name: '1º Fiel Devoto' },
    { id: 'unlock_incarnation', name: 'Selo da Encarnação' },
    { id: 'unlock_fervor_upgrades', name: 'Selo do Fervor' },
    { id: 'incarnation_stage_2', name: 'Avatar Consagrado (2.5M)' },
    { id: 'unlock_relics', name: 'Selo das Relíquias (20M)' },
    { id: 'first_relic_reset', name: '1ª Transmutação Relíquias' },
    { id: 'unlock_gnose', name: 'Selo da Gnose (1Q)' },
    { id: 'first_gnose_reset', name: '1º Despertar Gnóstico' },
    { id: 'first_gnose_upgrade', name: '1º Upgrade da Gnose' },
    { id: 'boss_anubis', name: 'Guardião 1: Anúbis (Tier II)' },
    { id: 'boss_cronos', name: 'Guardião 2: Cronos (Tier III)' },
    { id: 'boss_odin', name: 'Guardião 3: Odin (Tier IV)' },
    { id: 'gnose_tree_complete', name: 'Árvore da Gnose (20/20)' },
    { id: 'boss_tiamat', name: 'Chefe Final: Tiamat (Endgame)' }
  ];

  for (const m of allMilestoneIds) {
    const timeActive = active.milestones.find((x) => x.id === m.id)?.formattedTime ?? 'Não atingido';
    const timeCasual = casual.milestones.find((x) => x.id === m.id)?.formattedTime ?? 'Não atingido';
    const timeAfk = afk.milestones.find((x) => x.id === m.id)?.formattedTime ?? 'Não atingido';

    lines.push(
      `  ${m.name.padEnd(34)} | ${timeActive.padEnd(16)} | ${timeCasual.padEnd(16)} | ${timeAfk.padEnd(16)}`
    );
  }

  lines.push(thinDivider);
  lines.push(
    `  ${'TEMPO TOTAL ATÉ CHEFE FINAL'.padEnd(34)} | ${active.formattedTotalTime.padEnd(16)} | ${casual.formattedTotalTime.padEnd(16)} | ${afk.formattedTotalTime.padEnd(16)}`
  );
  lines.push(
    `  ${'Nós da Gnose Assimilados'.padEnd(34)} | ${`${active.gnoseUpgradesBought}/20`.padEnd(16)} | ${`${casual.gnoseUpgradesBought}/20`.padEnd(16)} | ${`${afk.gnoseUpgradesBought}/20`.padEnd(16)}`
  );
  lines.push(
    `  ${'Chefes Mitológicos Subjugados'.padEnd(34)} | ${`${active.bossesDefeated}/4`.padEnd(16)} | ${`${casual.bossesDefeated}/4`.padEnd(16)} | ${`${afk.bossesDefeated}/4`.padEnd(16)}`
  );
  lines.push(
    `  ${'Ascensões de Gnose Feitas'.padEnd(34)} | ${String(active.gnoseResets).padEnd(16)} | ${String(casual.gnoseResets).padEnd(16)} | ${String(afk.gnoseResets).padEnd(16)}`
  );
  lines.push(
    `  ${'Milagres Coletados dos Fiéis'.padEnd(34)} | ${String(active.miraclesCaught).padEnd(16)} | ${String(casual.miraclesCaught).padEnd(16)} | ${String(afk.miraclesCaught).padEnd(16)}`
  );
  lines.push(
    `  ${'Resets de Relíquia Feitos'.padEnd(34)} | ${String(active.relicResets).padEnd(16)} | ${String(casual.relicResets).padEnd(16)} | ${String(afk.relicResets).padEnd(16)}`
  );
  lines.push(
    `  ${'Maior Espera Ociosa (Max Wait)'.padEnd(34)} | ${active.formattedMaxWait.padEnd(16)} | ${casual.formattedMaxWait.padEnd(16)} | ${afk.formattedMaxWait.padEnd(16)}`
  );
  lines.push(
    `  ${'Zonas Mortas Detectadas'.padEnd(34)} | ${String(active.deadZones.length).padEnd(16)} | ${String(casual.deadZones.length).padEnd(16)} | ${String(afk.deadZones.length).padEnd(16)}`
  );
  lines.push(
    `  ${'Diagnóstico de Balanceamento'.padEnd(34)} | ${active.summaryScore.padEnd(16)} | ${casual.summaryScore.padEnd(16)} | ${afk.summaryScore.padEnd(16)}`
  );
  lines.push(divider);

  // Dead Zones Details
  lines.push('  DETALHAMENTO DE ZONAS MORTAS (DEAD ZONES):');
  const allDeadZones: { arch: string; dz: DeadZone }[] = [
    ...active.deadZones.map((dz) => ({ arch: 'ATIVO', dz })),
    ...casual.deadZones.map((dz) => ({ arch: 'CASUAL', dz })),
    ...afk.deadZones.map((dz) => ({ arch: 'AFK', dz }))
  ];

  if (allDeadZones.length === 0) {
    lines.push('  ✓ Nenhuma Zona Morta crítica detectada! O fluxo de progressão flui sem esperas excessivas.');
  } else {
    for (const item of allDeadZones) {
      lines.push(
        `  ⚠ [${item.arch} - Fase ${item.dz.phase.toUpperCase()}] Duração: ${item.dz.formattedDuration} | Alvo: ${item.dz.targetAction} | Motivo: ${item.dz.reason}`
      );
    }
  }

  lines.push(divider);
  lines.push('');
  return lines.join('\n');
}

export function formatHtmlReport(report: BenchmarkReport): string {
  const { active, casual, afk } = report.results;

  const milestonesList = [
    { id: 'first_follower', name: '1º Fiel Devoto' },
    { id: 'unlock_incarnation', name: 'Selo da Encarnação' },
    { id: 'unlock_fervor_upgrades', name: 'Selo do Fervor' },
    { id: 'incarnation_stage_2', name: 'Avatar Consagrado' },
    { id: 'unlock_relics', name: 'Selo das Relíquias' },
    { id: 'first_relic_reset', name: '1ª Transmutação Relíquias' },
    { id: 'unlock_gnose', name: 'Selo da Gnose' },
    { id: 'first_gnose_reset', name: '1º Despertar Gnóstico' },
    { id: 'first_gnose_upgrade', name: '1º Upgrade da Gnose' },
    { id: 'boss_anubis', name: 'Guardião 1: Anúbis (Tier II)' },
    { id: 'boss_cronos', name: 'Guardião 2: Cronos (Tier III)' },
    { id: 'boss_odin', name: 'Guardião 3: Odin (Tier IV)' },
    { id: 'gnose_tree_complete', name: 'Árvore da Gnose (20/20)' },
    { id: 'boss_tiamat', name: 'Chefe Final: Tiamat (Endgame)' }
  ];

  return `
    <div style="font-family: monospace; font-size: 13px; color: #f8fafc; line-height: 1.5;">
      <h3 style="color: #fbbf24; margin: 0 0 10px; font-size: 16px; border-bottom: 1px solid #d97706; padding-bottom: 6px;">
        ⚙️ Relatório de Progressão e Balanceamento (Até o Chefe Final: Tiamat)
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; text-align: left;">
        <thead>
          <tr style="background: rgba(245, 158, 11, 0.15); color: #fde68a;">
            <th style="padding: 6px 8px; border: 1px solid #78350f;">Marco / Métrica</th>
            <th style="padding: 6px 8px; border: 1px solid #78350f;">Ativo (Devoto)</th>
            <th style="padding: 6px 8px; border: 1px solid #78350f;">Casual (Híbrido)</th>
            <th style="padding: 6px 8px; border: 1px solid #78350f;">AFK (Ocioso)</th>
          </tr>
        </thead>
        <tbody>
          ${milestonesList
            .map(
              (m) => `
            <tr>
              <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1;">${m.name}</td>
              <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #67e8f9;">${active.milestones.find((x) => x.id === m.id)?.formattedTime ?? '-'}</td>
              <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #a5b4fc;">${casual.milestones.find((x) => x.id === m.id)?.formattedTime ?? '-'}</td>
              <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #f472b6;">${afk.milestones.find((x) => x.id === m.id)?.formattedTime ?? '-'}</td>
            </tr>
          `
            )
            .join('')}
          <tr style="background: rgba(255,255,255,0.05); font-weight: bold;">
            <td style="padding: 6px 8px; border: 1px solid #78350f; color: #fbbf24;">TEMPO TOTAL ATÉ TIAMAT</td>
            <td style="padding: 6px 8px; border: 1px solid #78350f; color: #67e8f9;">${active.formattedTotalTime}</td>
            <td style="padding: 6px 8px; border: 1px solid #78350f; color: #a5b4fc;">${casual.formattedTotalTime}</td>
            <td style="padding: 6px 8px; border: 1px solid #78350f; color: #f472b6;">${afk.formattedTotalTime}</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1;">Chefes Subjugados</td>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #67e8f9;">${active.bossesDefeated}/4</td>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #a5b4fc;">${casual.bossesDefeated}/4</td>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #f472b6;">${afk.bossesDefeated}/4</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1;">Ascensões de Gnose</td>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #67e8f9;">${active.gnoseResets}</td>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #a5b4fc;">${casual.gnoseResets}</td>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #f472b6;">${afk.gnoseResets}</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1;">Milagres dos Fiéis</td>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #67e8f9;">${active.miraclesCaught}</td>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #a5b4fc;">${casual.miraclesCaught}</td>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #f472b6;">${afk.miraclesCaught}</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1;">Resets de Relíquia</td>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1);">${active.relicResets}</td>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1);">${casual.relicResets}</td>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1);">${afk.relicResets}</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1;">Zonas Mortas</td>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: ${active.deadZones.length > 0 ? '#ef4444' : '#10b981'};">${active.deadZones.length}</td>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: ${casual.deadZones.length > 0 ? '#ef4444' : '#10b981'};">${casual.deadZones.length}</td>
            <td style="padding: 4px 8px; border: 1px solid rgba(255,255,255,0.1); color: ${afk.deadZones.length > 0 ? '#ef4444' : '#10b981'};">${afk.deadZones.length}</td>
          </tr>
        </tbody>
      </table>
      <div style="background: rgba(0,0,0,0.4); border-left: 3px solid #f59e0b; padding: 8px 12px; margin-top: 10px;">
        <strong style="color: #fde68a;">Diagnóstico:</strong>
        <p style="margin: 4px 0 0; color: #cbd5e1;">
          Ativo: <strong>${active.summaryScore}</strong> | Casual: <strong>${casual.summaryScore}</strong> | AFK: <strong>${afk.summaryScore}</strong>
        </p>
      </div>
    </div>
  `;
}
