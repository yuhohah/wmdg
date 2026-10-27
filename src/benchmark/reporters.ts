import { GNOSE_UPGRADES } from '../config/gnose.js';
import { GNOSE_BOSSES } from '../config/bosses.js';
import { describeBehavior } from './behavior.js';
import type { ArchetypeBenchmarkResult, BenchmarkReport } from './types.js';

export function formatDuration(seconds: number): string {
  if (seconds < 0 || !Number.isFinite(seconds)) return 'N/A';
  // Millions of 100-ms steps can leave integer-second totals a few microseconds short.
  const whole = Math.floor(seconds + 1e-4);
  if (whole < 60) return `${whole}s`;
  const minutes = Math.floor(whole / 60);
  if (minutes < 60) return `${minutes}m ${whole % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
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


const MILESTONES = [
  ['first_follower', '1º Fiel Devoto'], ['unlock_incarnation', 'Selo da Encarnação'],
  ['unlock_fervor_upgrades', 'Selo do Fervor'], ['incarnation_stage_2', 'Avatar Consagrado'],
  ['unlock_relics', 'Selo das Relíquias'], ['first_relic_reset', '1ª Transmutação'],
  ['unlock_gnose', 'Selo da Gnose'], ['first_gnose_reset', '1ª Ascensão'],
  ['first_gnose_upgrade', '1º Upgrade da Gnose'], ['boss_anubis', 'Anúbis'],
  ['boss_cronos', 'Cronos'], ['boss_odin', 'Odin'], ['gnose_tree_complete', 'Árvore da Gnose completa'],
  ['boss_tiamat', 'Tiamat'],
];

const METRICS: Array<[string, (result: ArchetypeBenchmarkResult) => string]> = [
  ['Situação', r => r.completed ? 'Concluído' : r.status === 'blocked' ? 'Bloqueado' : 'Incompleto (limite)'],
  ['Tempo decorrido', r => r.formattedTotalTime],
  ['Tempo presente', r => formatDuration(r.presentTimeSec)],
  ['Tempo ausente', r => formatDuration(r.awayTimeSec)],
  ['Visitas', r => String(r.visits)],
  ['Interações manuais', r => String(r.manualActions)],
  ['Cliques na Esfera / críticos', r => `${r.sphereClicks} / ${r.criticalClicks}`],
  ['Cliques de recuperação após Gnose', r => String(r.postGnoseRecoveryClicks)],
  ['Último clique na Esfera', r => r.lastSphereClickSec === undefined ? 'Nunca' : formatDuration(r.lastSphereClickSec)],
  ['Última ativação manual do 2×', r => r.lastManualBlessingSec === undefined ? 'Nunca' : formatDuration(r.lastManualBlessingSec)],
  ['Milagres coletados / surgidos', r => `${r.miraclesCaught} / ${r.miraclesSpawned}`],
  ['Nós da Gnose', r => `${r.gnoseUpgradesBought}/${GNOSE_UPGRADES.length}`],
  ['Chefes derrotados', r => `${r.bossesDefeated}/${GNOSE_BOSSES.length}`],
  ['Ascensões / Transmutações', r => `${r.gnoseResets} / ${r.relicResets}`],
  ['Maior intervalo sem progresso', r => r.formattedMaxWait],
  ['Maior ociosidade presente', r => formatDuration(r.maxPresentIdleSec)],
  ['Zonas mortas enquanto presente', r => String(r.deadZones.length)],
  ['Avaliação de ritmo', r => r.summaryScore],
];

function rows(report: BenchmarkReport): string[][] {
  const results = [report.results.active, report.results.casual, report.results.afk];
  return [
    ...MILESTONES.map(([id, name]) => [name, ...results.map(r => r.milestones.find(m => m.id === id)?.formattedTime ?? 'Não atingido')]),
    ...METRICS.map(([name, value]) => [name, ...results.map(value)]),
  ];
}

export function formatTerminalReport(report: BenchmarkReport): string {
  const first = report.results.active;
  const line = '─'.repeat(112);
  const lines = [
    '\nSIMULAÇÃO DE PROGRESSÃO POR SESSÕES — CULT OF THE SPHERE',
    `Seed: ${first.seed} | passo máximo: ${first.stepSec}s | limite: ${formatDuration(first.maxDurationSec)}`,
    'Hipótese: jogo aberto e visível. Ausência do jogador mantém produção; ações manuais só durante visitas.',
    ...(['active', 'casual', 'afk'] as const).map(describeBehavior),
    line,
    ['Marco / Métrica', 'Ativo', 'Casual', 'AFK'].map((s, i) => s.padEnd(i === 0 ? 35 : 23)).join(' | '),
    line,
    ...rows(report).map(row => row.map((s, i) => s.padEnd(i === 0 ? 35 : 23)).join(' | ')),
    line,
    'Avaliação de ritmo é heurística; ausências programadas não são zonas mortas forçadas.',
    'Incompleto indica limite ou bloqueio, nunca uma previsão de tempo até Tiamat.',
  ];
  for (const result of Object.values(report.results)) {
    if (result.blockedReason) lines.push(`[${result.archetype}] Bloqueado: ${result.blockedReason}`);
    for (const zone of result.deadZones) lines.push(`[${result.archetype}] ${zone.formattedDuration} presente sem progresso desde ${formatDuration(zone.startTimeSec)} (${zone.phase}).`);
  }
  return lines.join('\n') + '\n';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function formatHtmlReport(report: BenchmarkReport): string {
  const first = report.results.active;
  const cell = 'padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.15);text-align:left';
  return `<div style="font:13px monospace;color:#f8fafc;line-height:1.5">
    <h3>Simulação de progressão por sessões</h3>
    <p>Seed ${first.seed} · passo máximo ${first.stepSec}s · limite ${formatDuration(first.maxDurationSec)}.</p>
    <p>Jogo aberto e visível. Hipóteses de comportamento, não telemetria.</p>
    ${(['active', 'casual', 'afk'] as const).map(profile => `<p>${escapeHtml(describeBehavior(profile))}</p>`).join('')}
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
      <thead><tr>${['Marco / Métrica', 'Ativo', 'Casual', 'AFK'].map(name => `<th style="${cell}">${name}</th>`).join('')}</tr></thead>
      <tbody>${rows(report).map(row => `<tr>${row.map(value => `<td style="${cell}">${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    ${Object.values(report.results).filter(r => r.blockedReason).map(r => `<p><strong>${escapeHtml(r.archetypeName)} — bloqueado:</strong> ${escapeHtml(r.blockedReason!)}</p>`).join('')}
    <p>Incompleto = limite ou bloqueio, sem previsão de tempo até Tiamat. Ausências programadas não entram nas zonas mortas enquanto presente. A avaliação de ritmo é heurística.</p>
  </div>`;
}
