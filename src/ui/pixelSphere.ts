/** Paints the Esfera on a 64px canvas using one shared 32px logical grid. */
export function paintPixelSphere(canvas: HTMLCanvasElement, late = false): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, 64, 64);
  const colors = late
    ? ['#251b3e', '#483060', '#76548b', '#b79bcc', '#f5dfaa']
    : ['#4b302b', '#896040', '#c49850', '#e9c878', '#fff0b3'];
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const dx = x - 15.5, dy = y - 15.5;
    const distance = Math.hypot(dx, dy);
    if (distance > 10.5) continue;
    const light = Math.max(0, Math.min(4, Math.floor(4 - Math.hypot(x - 12, y - 11) / 4)));
    ctx.fillStyle = colors[distance > 9.4 ? 1 : light];
    ctx.fillRect(x * 2, y * 2, 2, 2);
  }
  ctx.fillStyle = '#fff0b3';
  ctx.fillRect(26, 22, 4, 6);
  ctx.fillRect(24, 24, 8, 2);
  if (late) {
    ctx.strokeStyle = '#b79bcc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(32, 32, 28, 12, -0.4, 0, Math.PI * 2);
    ctx.stroke();
    for (const [x, y] of [[6, 14], [52, 10], [54, 46], [12, 52]]) {
      ctx.fillStyle = '#e9c878';
      ctx.fillRect(x, y, 4, 4);
    }
  }
}
