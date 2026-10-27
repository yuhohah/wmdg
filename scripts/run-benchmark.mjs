import { createServer } from 'vite';

const args = new Map(process.argv.slice(2).map(arg => {
  const [key, ...value] = arg.replace(/^--/, '').split('=');
  return [key, value.join('=')];
}));
for (const key of args.keys()) {
  if (!['seed', 'seeds', 'hours', 'json'].includes(key)) throw new Error(`Argumento desconhecido: --${key}`);
}
for (const key of ['seed', 'seeds', 'hours']) {
  if (args.has(key) && !args.get(key)) throw new Error(`Informe um valor para --${key}.`);
}
const seeds = args.has('seeds') ? args.get('seeds').split(',').map(Number) : [Number(args.get('seed') ?? 0xc0172)];
const hours = Number(args.get('hours') ?? 72);
if (!seeds.length || seeds.some(seed => !Number.isInteger(seed) || !Number.isFinite(seed))) throw new Error('Seeds inválidas.');
if (!Number.isFinite(hours) || hours < 0) throw new Error('Limite de horas inválido.');
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { ProgressionSimulator } = await server.ssrLoadModule('/src/benchmark/ProgressionSimulator.ts');
  const { formatTerminalReport, formatDuration } = await server.ssrLoadModule('/src/benchmark/reporters.ts');
  const reports = [];
  for (const seed of seeds) {
    const report = ProgressionSimulator.runFullBenchmark({ seed, maxDurationSec: hours * 3600 });
    reports.push(report);
    if (!args.has('json')) console.log(formatTerminalReport(report));
  }
  if (args.has('json')) console.log(JSON.stringify(reports, null, 2));
  else if (reports.length > 1) {
    console.log('DISTRIBUIÇÃO ENTRE SEEDS (somente campanhas concluídas; limites e bloqueios separados):');
    for (const profile of ['active', 'casual', 'afk']) {
      const completed = reports.map(r => r.results[profile]).filter(r => r.completed).map(r => r.totalSimulatedTimeSec).sort((a, b) => a - b);
      const blocked = reports.filter(r => r.results[profile].status === 'blocked').length;
      const limited = reports.filter(r => r.results[profile].status === 'time_limit').length;
      const median = completed.length % 2 ? completed[(completed.length - 1) / 2] : (completed[completed.length / 2 - 1] + completed[completed.length / 2]) / 2;
      console.log(`${profile}: ${completed.length}/${reports.length} concluídos; ${blocked} bloqueados; ${limited} limitados; min/mediana/max: ${completed.length ? [completed[0], median, completed.at(-1)].map(formatDuration).join(' / ') : 'não atingido'}`);
    }
  }
} finally {
  await server.close();
}
