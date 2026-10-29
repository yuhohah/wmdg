import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
const inputs = process.argv.slice(2);
if (!inputs.length) throw new Error('Informe arquivos JSON ou JSON.gz.');
const read = file => JSON.parse(file.endsWith('.gz') ? gunzipSync(readFileSync(file)).toString() : readFileSync(file, 'utf8'));
const reports = inputs.map(read);
const rows = reports.flatMap(r => r.results);
const costs = JSON.stringify(reports[0].metadata?.costs);
if (reports.some(r => JSON.stringify(r.metadata?.costs) !== costs)) throw new Error('Não misture famílias de preços.');
const groups = new Map();
for (const {scenario, result} of rows) {
  const key = `${scenario}:${result.seed}`;
  if (groups.has(key)) throw new Error(`Seed duplicada: ${key}`);
  groups.set(key, true);
}
const median = values => {
  const sorted = [...values].sort((a,b)=>a-b), mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
};
const summary = [];
for (const scenario of new Set(rows.map(r=>r.scenario))) {
  const results = rows.filter(r=>r.scenario===scenario).map(r=>r.result);
  const durations = results.map(r=>r.completed ? r.totalSimulatedTimeSec : Infinity);
  const recoveries = results.flatMap(r=>r.progression.recoveries.slice(2).map(v=>({ ...v, observedSec:r.totalSimulatedTimeSec-v.resetSec })));
  const failedRecovery = recoveries.filter(v => v.recoveredAfterSec !== null ? v.recoveredAfterSec > Math.min(600,v.previousCycleSec*.25) : v.observedSec > Math.min(600,v.previousCycleSec*.25));
  const censoredRecovery = recoveries.filter(v=>v.recoveredAfterSec===null&&v.observedSec<=Math.min(600,v.previousCycleSec*.25));
  summary.push({ scenario, campaigns:results.length, completed:results.filter(r=>r.completed).length,
    incomplete:results.filter(r=>!r.completed).map(r=>({seed:r.seed,status:r.status,nodes:r.gnoseUpgradesBought,resets:r.gnoseResets})),
    // Incomplete runs stay in the denominator and cannot pass by disappearing from medians.
    medianHours:Number.isFinite(median(durations))?median(durations)/3600:null,
    worstHours:durations.every(Number.isFinite)?Math.max(...durations)/3600:null,
    observedLimitHours:Math.max(...results.map(r=>r.totalSimulatedTimeSec))/3600,
    presentMedianHours:median(results.map(r=>r.presentTimeSec))/3600,
    permanentGapMaxMin:Math.max(...results.map(r=>r.progression.maxPermanentGapSec))/60,
    relevantGapMaxMin:Math.max(...results.map(r=>r.progression.maxRelevantGapSec))/60,
    resetsMin:Math.min(...results.map(r=>r.gnoseResets)),resetsMax:Math.max(...results.map(r=>r.gnoseResets)),
    recoveryMeasured:recoveries.length,recoveryFailures:failedRecovery.length,recoveryCensored:censoredRecovery.length,
    manualProductionDrops:results.reduce((sum,r)=>sum+r.progression.productionDrops.length,0),
    solarBeforeChaos:results.filter(r=>r.progression.advances.some(a=>a.id==='avatar-5'&&a.timeSec<(r.milestones.find(m=>m.id==='boss_tiamat')?.gameTimeSec??Infinity))).length,
    durationPass:results.every(r=>r.completed&&r.totalSimulatedTimeSec<20*3600),
  });
}
writeFileSync('Base/progression-final-summary.json',JSON.stringify({ inputs,metadata:reports[0].metadata,summary },null,2));
console.log(JSON.stringify(summary,null,2));
