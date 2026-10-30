// Dev browser: await (await import('/scripts/audit-hidden-views.mjs')).auditHiddenViews()
// Exercises the live app without changing resources or saving a fixture.
import { auditRendering } from './audit-rendering.mjs';

export async function auditHiddenViews(app = window.cultGame) {
  if (!app || !document.body.classList.contains('is-playing')) throw new Error('Start the local dev game first.');
  if (document.querySelector('.modal-overlay.open')) throw new Error('Close the modals before running.');
  const { formatNumber } = await import('/src/systems/calculations.ts');
  const previous = app.board.currentFocusedCardId;
  const checks = [];
  const waitForVisibility = () => new Promise(resolve => setTimeout(resolve, 250));
  try {
    app.board.centerOnCard('card-altar-sphere', true);
    await new Promise(resolve => setTimeout(resolve, 2200));
    const faith = app.gameState.faithPoints;
    const measured = await auditRendering(2, app);
    const hidden = new Set(measured.visibility.filter(v => !v.inViewport).map(v => v.id));
    const hiddenMutations = measured.samples.reduce((sum, sample) => sum + Object.entries(sample.mutations)
      .filter(([key]) => hidden.has(key.split(':')[0]) || key.startsWith('settings-modal:'))
      .reduce((n, [, count]) => n + count, 0), 0);
    checks.push({ name: 'no mutations in off-screen cards or closed settings', pass: hiddenMutations === 0, hiddenMutations });
    checks.push({ name: 'simulation keeps ticking', pass: measured.samples.every(s => s.calls['simulation.tick'] >= 9) });
    if (app.gameState.getFaithPerSecond() > 0) {
      checks.push({ name: 'faith keeps accumulating', pass: app.gameState.faithPoints > faith });
    }

    const scenarios = [
      ['card-followers', () => document.getElementById('followers-total-count').textContent === formatNumber(app.gameState.getTotalFollowersCount())],
      ['card-fervor', () => document.querySelectorAll('#fervor-upgrades-list .fervor-upgrade-card').length > 0 &&
        document.getElementById('fervor-counter').textContent === formatNumber(Math.floor(app.gameState.fervorPoints))],
      ['card-relics', () => document.getElementById('relics-balance-val').textContent === formatNumber(app.gameState.relicPoints)],
      ['card-gnose', () => document.querySelectorAll('.gnose-tree-node').length > 0],
      ['card-incarnation', () => app.incarnationTab.altar.getCurrentStage() === app.gameState.incarnationStage],
    ];
    for (const [id, check] of scenarios) {
      const element = document.getElementById(id);
      if (!element || getComputedStyle(element).display === 'none') continue;
      app.board.centerOnCard(id, true);
      await waitForVisibility();
      checks.push({ name: `${id} refreshes on entry`, pass: check() });
    }
    app.settingsModal.open();
    checks.push({ name: 'settings statistics refresh on open', pass:
      document.getElementById('stat-total-followers').textContent === formatNumber(app.gameState.getTotalFollowersCount()) });
    app.settingsModal.close();
    app.achievementsTab.openModal();
    checks.push({ name: 'achievements refresh on open', pass:
      document.querySelectorAll('#achievements-list .ach-card').length === app.gameState.achievements.length });
    return { pass: checks.every(c => c.pass), checks };
  } finally {
    app.settingsModal.close();
    app.achievementsTab.closeModal();
    app.board.centerOnCard(previous, true);
  }
}
