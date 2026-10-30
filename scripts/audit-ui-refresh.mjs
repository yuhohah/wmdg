// In the dev browser: await (await import('/scripts/audit-ui-refresh.mjs')).auditUIRefresh()
// Uses the live controllers without advancing, saving, or replacing game progress.
export function auditUIRefresh(app = window.cultGame) {
  if (!app) throw new Error('Open the game on the local dev server first.');
  const refresh = () => {
    app.hud.update();
    app.followersTab.updateUI();
    app.fervorTab.updateButtonStates();
  };
  refresh();
  const observer = new MutationObserver(() => {});
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  const start = performance.now();
  for (let i = 0; i < 100; i++) refresh();
  const elapsedMs = performance.now() - start;
  const textMutations = observer.takeRecords().length;
  observer.disconnect();

  const faith = app.gameState.faithPoints;
  const counter = document.getElementById('faith-counter');
  const before = counter?.textContent;
  let changedValueRendered = false;
  try {
    app.gameState.faithPoints = faith === 123 ? 456 : 123;
    app.hud.update();
    changedValueRendered = counter?.textContent !== before;
  } finally {
    app.gameState.faithPoints = faith;
    refresh();
  }
  return {
    elapsedMs, textMutations, changedValueRendered,
    pass: textMutations === 0 && changedValueRendered,
  };
}
