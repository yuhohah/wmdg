(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg', TAU = Math.PI * 2;
  const svg = document.getElementById('armillary');
  const rear = document.getElementById('rear'), front = document.getElementById('front');
  const core = document.getElementById('sphere');
  const ringColor = '#dedccd';
  const rings = [
    { id: 'meridiano', radius: 174, width: 7, beta: 90, phase: 73, tilt: -10, period: 12, direction: 1 },
    { id: 'equador', radius: 150, width: 7, beta: 12, phase: 0, tilt: 0, period: 16, direction: -1 },
    { id: 'obliquo', radius: 199, width: 7, beta: 30, phase: 0, tilt: 35, period: 24, direction: 1 },
    { id: 'externo', radius: 222, width: 7, beta: 90, phase: 0, tilt: 0, period: 24, direction: 1, pitch: true },
  ];
  const rad = degrees => degrees * Math.PI / 180;
  let time = 0, sphereAngle = 0, direction = 1, speed = 1;
  let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches, last = null;
  const segments = [];
  const make = tag => document.createElementNS(NS, tag);
  for (const ring of rings) for (let i = 0; i < 96; i++) {
    const group = make('g'), band = make('path');
    group.dataset.ring = ring.id;
    band.setAttribute('stroke-width', '2');
    group.append(band);
    segments.push({ ring, i, group, band, order: segments.length });
  }
  function point(r, angle) {
    const rotation = r.direction * TAU * (time % r.period) / r.period;
    const beta = rad(r.beta) + (r.pitch ? rotation : 0);
    const phi = rad(r.phase) + (r.pitch ? 0 : rotation), tilt = rad(r.tilt);
    let x = r.radius * Math.cos(angle), y = r.radius * Math.sin(angle) * Math.sin(beta);
    let z = r.radius * Math.sin(angle) * Math.cos(beta);
    [x, z] = [x * Math.cos(phi) + z * Math.sin(phi), -x * Math.sin(phi) + z * Math.cos(phi)];
    [x, y] = [x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt)];
    return [256 + x, 256 - y, z];
  }
  const xy = p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  function render() {
    for (const item of segments) {
      const { ring: r, i, band } = item;
      const a = i * TAU / 96, b = (i + 1) * TAU / 96;
      const p = point(r, a), q = point(r, b);
      // Adjacent segments share the same vertex normal: no dark wedge seams.
      const normal = angle => {
        const before = point(r, angle - .0001), after = point(r, angle + .0001);
        const dx = after[0]-before[0], dy = after[1]-before[1], length = Math.hypot(dx,dy);
        // A same-color 2 px stroke seals antialiasing seams; keep total width exact.
        const half = (r.width - 2) / 2;
        return length > 1e-8 ? [-dy/length*half, dx/length*half] : [half,0];
      };
      const [nx,ny] = normal(a), [mx,my] = normal(b);
      const corners = [[p[0]+nx,p[1]+ny],[q[0]+mx,q[1]+my],[q[0]-mx,q[1]-my],[p[0]-nx,p[1]-ny]];
      band.setAttribute('d', `M${corners.map(xy).join('L')}Z`);
      band.setAttribute('fill', ringColor); band.setAttribute('stroke', ringColor);
      item.depth = (p[2] + q[2]) / 2;
    }
    segments.sort((a, b) => a.depth - b.depth || a.order - b.order);
    const backNodes = document.createDocumentFragment(), frontNodes = document.createDocumentFragment();
    for (const item of segments) (item.depth < 0 ? backNodes : frontNodes).append(item.group);
    rear.append(backNodes); front.append(frontNodes);
    core.setAttribute('transform', `rotate(${sphereAngle} 256 256)`);
  }
  function advance(seconds) {
    time = (time + seconds * speed) % 48;
    // SVG uses screen coordinates: a positive angle is clockwise as seen by the viewer.
    sphereAngle = ((sphereAngle + direction * seconds * speed * 360 / 24) % 360 + 360) % 360;
    render();
  }
  const pause = document.getElementById('play'), invert = document.getElementById('invert');
  function updateControls() {
    pause.textContent = playing ? 'Pausar' : 'Continuar';
    document.getElementById('direction').textContent = direction === 1 ? 'Esfera: horário' : 'Esfera: anti-horário';
  }
  function reverse() { direction *= -1; updateControls(); }
  pause.onclick = () => { playing = !playing; last = null; updateControls(); };
  invert.onclick = reverse;
  document.getElementById('speed').onchange = event => { speed = Number(event.target.value); };
  document.getElementById('reset').onclick = () => { time = sphereAngle = 0; last = null; render(); };
  document.getElementById('export').onclick = () => {
    const clone = svg.cloneNode(true);
    clone.removeAttribute('id'); clone.removeAttribute('aria-labelledby');
    clone.querySelector('#sphere').remove();
    clone.querySelector('defs').remove();
    clone.querySelector('title').textContent = 'Aros vetoriais — pose atual';
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'aros-meridianos.svg'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  document.addEventListener('visibilitychange', () => { last = null; });
  function tick(now) {
    if (playing && !document.hidden && last !== null) advance(Math.min((now-last)/1000, .1));
    last = now; requestAnimationFrame(tick);
  }
  render(); updateControls(); requestAnimationFrame(tick);
  window.meridianDemo = {
    rings, render, advance, reverse, point,
    pause() { playing = false; last = null; updateControls(); },
    reset() { time = sphereAngle = 0; render(); },
    get state() { return { time, sphereAngle, direction, playing, speed }; },
  };
})();
