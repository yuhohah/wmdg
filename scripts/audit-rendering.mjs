// Dev browser: await (await import('/scripts/audit-rendering.mjs')).auditRendering()
// Counts application work, not GPU paints. Instrumentation is removed in finally.
export async function auditRendering(seconds = 3, app = window.cultGame) {
  if (!app) throw new Error('Open the local dev game first.');
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 10) throw new Error('Use 1–10 seconds.');
  const start = performance.now();
  const samples = Array.from({ length: seconds }, (_, i) => ({
    second: i + 1, calls: {}, mutations: {}, canvas: {}, frames: 0, slowFrames: 0,
  }));
  const restores = [];
  const bucket = () => samples[Math.floor((performance.now() - start) / 1000)];
  const wrap = (owner, name, label, category = 'calls') => {
    if (!owner || typeof owner[name] !== 'function') return;
    const own = Object.getOwnPropertyDescriptor(owner, name);
    const original = owner[name];
    owner[name] = function (...args) {
      const sample = bucket();
      if (sample) sample[category][label] = (sample[category][label] || 0) + 1;
      return original.apply(this, args);
    };
    restores.push(() => own ? Object.defineProperty(owner, name, own) : delete owner[name]);
  };
  const visibility = [...document.querySelectorAll('.dodeca-card, #card-unlocks')].map(el => {
    const r = el.getBoundingClientRect();
    return { id: el.id, inViewport: r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight };
  });
  const observer = new MutationObserver(records => {
    const sample = bucket();
    if (!sample) return;
    for (const record of records) {
      const el = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
      const region = el?.closest('.dodeca-card, #card-unlocks, .top-hud-bar, .modal-overlay');
      const key = `${region?.id || region?.classList[0] || 'other'}:${record.type}`;
      sample.mutations[key] = (sample.mutations[key] || 0) + 1;
    }
  });
  let frameId;
  let last;
  const frame = now => {
    const sample = bucket();
    if (sample) {
      sample.frames++;
      if (last !== undefined && now - last > 33.4) sample.slowFrames++;
    }
    last = now;
    frameId = requestAnimationFrame(frame);
  };
  try {
    for (const [owner, methods, prefix] of [
      [app.gameState, ['tick'], 'simulation'],
      [app.hud, ['update'], 'hud'],
      [app.statsTab, ['updateUI'], 'stats'],
      [app.achievementsTab, ['updateRealtime', 'checkAchievements', 'renderList'], 'achievements'],
      [app.followersTab, ['updateUI'], 'followers'],
      [app.fervorTab, ['updateButtonStates', 'renderList'], 'fervor'],
      [app.relicsTab, ['updateUI', 'renderList'], 'relics'],
      [app.gnoseTab, ['updateUI', 'renderTree'], 'gnose'],
      [app.incarnationTab, ['updateRealtime'], 'incarnation'],
      [app.followersTab.arena, ['update', 'draw'], 'followersCanvas'],
      [app.incarnationTab.altar, ['update', 'draw'], 'altarCanvas'],
      [app.board, ['applyTransform', 'updateActiveQuickNav'], 'board'],
    ]) for (const method of methods) wrap(owner, method, `${prefix}.${method}`);
    for (const canvas of document.querySelectorAll('canvas')) {
      const ctx = canvas.getContext('2d');
      for (const method of ['clearRect', 'drawImage', 'fillRect', 'fill', 'stroke']) {
        wrap(ctx, method, `${canvas.id}.${method}`, 'canvas');
      }
    }
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    frameId = requestAnimationFrame(frame);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    return { focus: app.board.currentFocusedCardId, visibility, samples,
      animations: document.getAnimations().map(a => ({ name: a.animationName || 'Web Animation', state: a.playState, target: a.effect?.target?.id || '' })) };
  } finally {
    observer.disconnect();
    cancelAnimationFrame(frameId);
    restores.reverse().forEach(restore => restore());
  }
}
