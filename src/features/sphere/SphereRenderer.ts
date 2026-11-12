import { RINGS, SphereMotion } from './SphereMotion.js';

const VERTEX_COUNT = 97;
const SEGMENT_COUNT_PER_RING = 96;
const MAX_RINGS = 4;
const MAX_SEGMENTS = MAX_RINGS * SEGMENT_COUNT_PER_RING;
const DEG_TO_RAD = Math.PI / 180;

const COS_A = new Float64Array(VERTEX_COUNT);
const SIN_A = new Float64Array(VERTEX_COUNT);
for (let i = 0; i < VERTEX_COUNT; i++) {
  const a = (i * Math.PI * 2) / SEGMENT_COUNT_PER_RING;
  COS_A[i] = Math.cos(a);
  SIN_A[i] = Math.sin(a);
}

// Reusable per-ring vertex buffers (zero per-frame heap allocations)
const vertPx = new Float64Array(VERTEX_COUNT);
const vertPy = new Float64Array(VERTEX_COUNT);
const vertPz = new Float64Array(VERTEX_COUNT);
const vertNx = new Float64Array(VERTEX_COUNT);
const vertNy = new Float64Array(VERTEX_COUNT);

// Reusable segment buffer: 8 coordinates (x0,y0..x3,y3) + depth per segment
const segDepth = new Float64Array(MAX_SEGMENTS);
const segCoords = new Float64Array(MAX_SEGMENTS * 8);

const EQUADOR_MERIDIAN_WIDTHS = [-139.65, -93.1, -46.55, 46.55, 93.1, 139.65] as const;
const EQUADOR_PARALLELS = [
  { y: -53, x: Math.sqrt(132 ** 2 - (-53) ** 2) },
  { y: 0, x: 132 },
  { y: 53, x: Math.sqrt(132 ** 2 - 53 ** 2) },
] as const;

function drawSegmentBatch(ctx: CanvasRenderingContext2D, count: number, frontPass: boolean): void {
  if (count === 0) return;
  ctx.fillStyle = '#dedccd';
  ctx.strokeStyle = '#dedccd';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  for (let s = 0; s < count; s++) {
    const isFront = segDepth[s] >= 0;
    if (isFront !== frontPass) continue;
    const base = s * 8;
    ctx.beginPath();
    ctx.moveTo(segCoords[base], segCoords[base + 1]);
    ctx.lineTo(segCoords[base + 2], segCoords[base + 3]);
    ctx.lineTo(segCoords[base + 4], segCoords[base + 5]);
    ctx.lineTo(segCoords[base + 6], segCoords[base + 7]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/** Depth-sorted vector bands surround the transparent engraved globe. */
export function drawSphere(ctx: CanvasRenderingContext2D, motion: SphereMotion, image?: HTMLImageElement, imageSize = motion.form.size): void {
  ctx.clearRect(0, 0, 512, 512);
  const ringCount = motion.form.rings;
  const isEquador = motion.form.id === 'equador';
  let totalSegments = 0;

  for (let ring = 0; ring < ringCount; ring++) {
    const spec = RINGS[ring];
    const rotation = motion.rings[ring].angle;
    const beta = spec.beta * DEG_TO_RAD + (spec.pitch ? rotation : 0);
    const phi = spec.phase * DEG_TO_RAD + (spec.pitch ? 0 : rotation);
    const tilt = spec.tilt * DEG_TO_RAD;
    const radius = isEquador && ring === 1 ? 148 : spec.radius;

    const cb = Math.cos(beta);
    const sb = Math.sin(beta);
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);

    // Linear basis vectors mapping (cos(a), sin(a)) -> screen (x, y, z)
    const ux = radius * cp * ct;
    const vx = radius * (cb * sp * ct - sb * st);
    const uy = -radius * cp * st;
    const vy = radius * (-cb * sp * st - sb * ct);
    const uz = -radius * sp;
    const vz = radius * cb * cp;

    for (let i = 0; i < VERTEX_COUNT; i++) {
      const ca = COS_A[i];
      const sa = SIN_A[i];
      vertPx[i] = 256 + ca * ux + sa * vx;
      vertPy[i] = 256 + ca * uy + sa * vy;
      vertPz[i] = ca * uz + sa * vz;

      // Analytical tangent dP/da = (-sa * u + ca * v)
      const dx = -sa * ux + ca * vx;
      const dy = -sa * uy + ca * vy;
      const invLen = 2.5 / (Math.hypot(dx, dy) || 1);
      vertNx[i] = -dy * invLen;
      vertNy[i] = dx * invLen;
    }

    for (let i = 0; i < SEGMENT_COUNT_PER_RING; i++) {
      const next = i + 1;
      const p0x = vertPx[i];
      const p0y = vertPy[i];
      const n0x = vertNx[i];
      const n0y = vertNy[i];
      const p1x = vertPx[next];
      const p1y = vertPy[next];
      const n1x = vertNx[next];
      const n1y = vertNy[next];

      segDepth[totalSegments] = (vertPz[i] + vertPz[next]) * 0.5;
      const base = totalSegments * 8;
      segCoords[base] = p0x + n0x;
      segCoords[base + 1] = p0y + n0y;
      segCoords[base + 2] = p1x + n1x;
      segCoords[base + 3] = p1y + n1y;
      segCoords[base + 4] = p1x - n1x;
      segCoords[base + 5] = p1y - n1y;
      segCoords[base + 6] = p0x - n0x;
      segCoords[base + 7] = p0y - n0y;
      totalSegments++;
    }
  }

  drawSegmentBatch(ctx, totalSegments, false);

  if (image) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(256, 256, ringCount === 4 ? 130 : 132, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(256, 256);
    ctx.rotate(motion.globe.angle);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, -imageSize / 2, -imageSize / 2, imageSize, imageSize);
    if (isEquador) {
      ctx.strokeStyle = '#68676a';
      ctx.globalAlpha = 0.38;
      ctx.lineWidth = 1;
      for (let i = 0; i < EQUADOR_MERIDIAN_WIDTHS.length; i++) {
        const width = EQUADOR_MERIDIAN_WIDTHS[i];
        ctx.beginPath();
        ctx.moveTo(0, -132);
        ctx.bezierCurveTo(width, -132, width, 132, 0, 132);
        ctx.stroke();
      }
      for (let i = 0; i < EQUADOR_PARALLELS.length; i++) {
        const { x, y } = EQUADOR_PARALLELS[i];
        ctx.beginPath();
        ctx.moveTo(-x, y);
        ctx.quadraticCurveTo(0, y + 22, x, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawSegmentBatch(ctx, totalSegments, true);
}
