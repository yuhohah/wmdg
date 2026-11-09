import { ringPoint, SphereMotion } from './SphereMotion.js';

/** Depth-sorted vector bands surround the transparent engraved globe. */
export function drawSphere(ctx: CanvasRenderingContext2D, motion: SphereMotion, image?: HTMLImageElement, imageSize = motion.form.size): void {
  ctx.clearRect(0, 0, 512, 512);
  const segments: { points: number[][]; depth: number }[] = [];
  for (let ring = 0; ring < motion.form.rings; ring++) {
    const vertices = Array.from({ length: 97 }, (_, i) => {
      const a = i * Math.PI * 2 / 96;
      const p = ringPoint(ring, a, motion.rings[ring].angle, motion.form);
      const before = ringPoint(ring, a - 0.0001, motion.rings[ring].angle, motion.form);
      const after = ringPoint(ring, a + 0.0001, motion.rings[ring].angle, motion.form);
      const dx = after[0] - before[0], dy = after[1] - before[1];
      const length = Math.hypot(dx, dy) || 1;
      return { p, n: [-dy / length * 2.5, dx / length * 2.5] };
    });
    for (let i = 0; i < 96; i++) {
      const { p, n } = vertices[i], { p: q, n: m } = vertices[i + 1];
      segments.push({ depth: (p[2] + q[2]) / 2, points: [
        [p[0] + n[0], p[1] + n[1]], [q[0] + m[0], q[1] + m[1]],
        [q[0] - m[0], q[1] - m[1]], [p[0] - n[0], p[1] - n[1]],
      ] });
    }
  }
  segments.sort((a, b) => a.depth - b.depth);
  const band = (segment: typeof segments[number]) => {
    ctx.beginPath();
    segment.points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle = '#dedccd';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.fill();
    ctx.stroke();
  };
  segments.filter(s => s.depth < 0).forEach(band);
  if (image) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(256, 256, motion.form.rings === 4 ? 130 : 132, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(256, 256);
    ctx.rotate(motion.globe.angle);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, -imageSize / 2, -imageSize / 2, imageSize, imageSize);
    if (motion.form.id === 'equador') {
      ctx.strokeStyle = '#68676a';
      ctx.globalAlpha = 0.38;
      ctx.lineWidth = 1;
      for (const width of [-139.65, -93.1, -46.55, 46.55, 93.1, 139.65]) {
        ctx.beginPath(); ctx.moveTo(0, -132);
        ctx.bezierCurveTo(width, -132, width, 132, 0, 132); ctx.stroke();
      }
      for (const y of [-53, 0, 53]) {
        const x = Math.sqrt(132 ** 2 - y ** 2);
        ctx.beginPath(); ctx.moveTo(-x, y); ctx.quadraticCurveTo(0, y + 22, x, y); ctx.stroke();
      }
    }
    ctx.restore();
  }
  segments.filter(s => s.depth >= 0).forEach(band);
}
