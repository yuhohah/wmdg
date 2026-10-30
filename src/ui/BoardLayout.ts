// Drag & drop layout for the board cards (n8n-style): cards are picked up by their header,
// snap to predefined slots or to a coarse grid, and never overlap each other.

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Point {
  x: number;
  y: number;
}

interface DragSession {
  card: HTMLElement;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  // Pointer offset from the card's top-left corner, in world units
  grab: Point;
  origin: Point;
  size: { w: number; h: number };
  obstacles: Rect[];
  lastClientX: number;
  lastClientY: number;
  target: Point;
  snappedSlot: number;
  moved: boolean;
}

export interface BoardLayoutHost {
  getZoom(): number;
  getPan(): Point;
  panBy(dx: number, dy: number): void;
  getViewport(): HTMLElement;
}

const WORLD_W = 6880;
const WORLD_H = 3840;
const GRID = 20;
const GAP = 20;
const SNAP_RADIUS = 90;
const DRAG_THRESHOLD = 4;
const EDGE_PAN_ZONE = 48;
const EDGE_PAN_SPEED = 14;
const LONG_PRESS_MS = 300;
// v2: cathedral landmark coordinates (v1 layouts were saved against the flat board)
const STORAGE_KEY = 'cult_board_layout_v2';

// Ray origin: center of the Sphere oculus
const RAY_ORIGIN = { x: 1740, y: 854 };

const DRAGGABLE_IDS = ['card-incarnation', 'card-relics', 'card-followers', 'card-fervor', 'card-gnose', 'card-unlocks'];
const FIXED_IDS = ['card-altar-sphere'];

// Docking slots, anchored at the card's top-center so cards of different widths share a column
// (cathedral landmarks: chancel, crypt, scriptorium, apex gallery, nave, hearth, tower)
const SLOTS: Point[] = [
  { x: 490, y: 440 },
  { x: 500, y: 1220 },
  { x: 1110, y: 160 },
  { x: 1110, y: 880 },
  { x: 1110, y: 1400 },
  { x: 1740, y: 30 },
  { x: 1740, y: 1260 },
  { x: 2260, y: 920 },
  { x: 2260, y: 1450 },
  { x: 2860, y: 880 },
  { x: 2860, y: 1450 },
  { x: 2970, y: 120 },
  { x: 4100, y: 440 },
  { x: 4100, y: 1800 },
  { x: 5400, y: 440 },
  { x: 5400, y: 1800 },
  { x: 1110, y: 2800 },
  { x: 2860, y: 2800 },
  { x: 4100, y: 2800 },
  { x: 5400, y: 2800 },
];

export class BoardLayout {
  private host: BoardLayoutHost;
  private worldEl: HTMLElement;
  private cards = new Map<string, HTMLElement>();
  private fixed: HTMLElement[] = [];
  private positions = new Map<string, Point>();
  private lastSizes = new Map<string, { w: number; h: number }>();
  private saved: Record<string, Point> = {};

  private slotsLayer: HTMLElement;
  private slotEls: HTMLElement[] = [];
  private ghostEl: HTMLElement;

  private drag: DragSession | null = null;
  private pending: { card: HTMLElement; e: PointerEvent; timer: number } | null = null;
  private frameRequested = false;
  private resolveRequested = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(host: BoardLayoutHost, worldEl: HTMLElement) {
    this.host = host;
    this.worldEl = worldEl;

    DRAGGABLE_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) this.cards.set(id, el);
    });
    FIXED_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) this.fixed.push(el);
    });

    this.slotsLayer = document.createElement('div');
    this.slotsLayer.className = 'board-slot-layer';
    SLOTS.forEach(() => {
      const slot = document.createElement('div');
      slot.className = 'board-slot';
      this.slotsLayer.appendChild(slot);
      this.slotEls.push(slot);
    });
    this.ghostEl = document.createElement('div');
    this.ghostEl.className = 'board-drop-ghost';
    this.worldEl.append(this.slotsLayer, this.ghostEl);

    this.loadSaved();
    this.cards.forEach((card, id) => {
      card.classList.add('is-draggable-card');
      const pos = this.saved[id];
      if (pos) this.place(card, pos);
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.requestResolve());
      this.cards.forEach((card) => this.resizeObserver!.observe(card));
      this.fixed.forEach((el) => this.resizeObserver!.observe(el));
    }

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
    // Wheel zoom mid-drag moves the world under the pointer
    host.getViewport().addEventListener('wheel', () => {
      if (this.drag) this.requestFrame();
    }, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.drag) this.finishDrag(true);
    });

    this.requestResolve();
  }

  // Returns the draggable card whose header was hit, or null
  public getHeaderCard(target: HTMLElement): HTMLElement | null {
    if (!target.closest('.dodeca-card-header') || target.closest('button')) return null;
    const card = target.closest<HTMLElement>('.dodeca-card');
    return card && this.cards.has(card.id) ? card : null;
  }

  // Mouse/pen pick up immediately; touch needs a long press so header swipes still pan the board.
  // Returns true when the board must not start panning.
  public beginPress(card: HTMLElement, e: PointerEvent, onLongPress: () => void): boolean {
    if (e.pointerType !== 'touch') {
      if (e.button !== 0) return false;
      e.preventDefault();
      this.startDrag(card, e);
      return true;
    }
    this.cancelPending();
    const timer = window.setTimeout(() => {
      if (!this.pending) return;
      const { card: pendingCard, e: startEvent } = this.pending;
      this.pending = null;
      onLongPress();
      navigator.vibrate?.(12);
      this.startDrag(pendingCard, startEvent);
    }, LONG_PRESS_MS);
    this.pending = { card, e, timer };
    return false;
  }

  public cancelPending(): void {
    if (!this.pending) return;
    window.clearTimeout(this.pending.timer);
    this.pending = null;
  }

  public resetLayout(): void {
    this.saved = {};
    this.persist();
    this.cards.forEach((card, id) => {
      card.style.left = '';
      card.style.top = '';
      this.positions.delete(id);
    });
    this.requestResolve();
  }

  // ---------------------------------------------------------------------------
  // Drag lifecycle
  // ---------------------------------------------------------------------------

  private startDrag(card: HTMLElement, e: PointerEvent): void {
    const origin = this.readPosition(card);
    const pointer = this.toWorld(e.clientX, e.clientY);
    this.drag = {
      card,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      grab: { x: pointer.x - origin.x, y: pointer.y - origin.y },
      origin,
      size: { w: card.offsetWidth, h: card.offsetHeight },
      obstacles: this.collectObstacles(card),
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      target: origin,
      snappedSlot: -1,
      // A long press already counts as a deliberate pick-up
      moved: e.pointerType === 'touch',
    };
    if (this.drag.moved) this.lift(this.drag);
  }

  private lift(d: DragSession): void {
    d.card.classList.add('is-lifted');
    this.worldEl.classList.add('is-arranging');
    this.ghostEl.style.width = `${d.size.w}px`;
    this.ghostEl.style.height = `${d.size.h}px`;
    this.positionSlotMarkers(d.size.w);
    this.requestFrame();
  }

  private onPointerMove = (e: PointerEvent): void => {
    if (this.pending && e.pointerId === this.pending.e.pointerId) {
      const moved = Math.hypot(e.clientX - this.pending.e.clientX, e.clientY - this.pending.e.clientY);
      if (moved > 6) this.cancelPending();
      return;
    }
    if (!this.drag || e.pointerId !== this.drag.pointerId) return;
    this.drag.lastClientX = e.clientX;
    this.drag.lastClientY = e.clientY;
    this.requestFrame();
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.pending && e.pointerId === this.pending.e.pointerId) this.cancelPending();
    if (this.drag && e.pointerId === this.drag.pointerId) this.finishDrag(false);
  };

  private onPointerCancel = (e: PointerEvent): void => {
    if (this.pending && e.pointerId === this.pending.e.pointerId) this.cancelPending();
    if (this.drag && e.pointerId === this.drag.pointerId) this.finishDrag(true);
  };

  private requestFrame(): void {
    if (this.frameRequested) return;
    this.frameRequested = true;
    window.requestAnimationFrame(this.frame);
  }

  private frame = (): void => {
    this.frameRequested = false;
    const d = this.drag;
    if (!d) return;
    if (!d.moved) {
      if (Math.hypot(d.lastClientX - d.startClientX, d.lastClientY - d.startClientY) < DRAG_THRESHOLD) return;
      d.moved = true;
      this.lift(d);
    }

    // Auto-pan when the pointer approaches the viewport edges
    const vp = this.host.getViewport().getBoundingClientRect();
    const edgeX = d.lastClientX < vp.left + EDGE_PAN_ZONE ? 1 : d.lastClientX > vp.right - EDGE_PAN_ZONE ? -1 : 0;
    const edgeY = d.lastClientY < vp.top + EDGE_PAN_ZONE ? 1 : d.lastClientY > vp.bottom - EDGE_PAN_ZONE ? -1 : 0;
    if (edgeX || edgeY) this.host.panBy(edgeX * EDGE_PAN_SPEED, edgeY * EDGE_PAN_SPEED);

    const free = this.freePosition(d);
    this.setOffset(d.card, free.x - d.origin.x, free.y - d.origin.y);

    const { point, slot } = this.snap(free, d.size);
    d.target = this.findFreeSpot(point, d.size, d.obstacles);
    if (slot !== d.snappedSlot) {
      if (d.snappedSlot >= 0) this.slotEls[d.snappedSlot].classList.remove('is-hot');
      if (slot >= 0) this.slotEls[slot].classList.add('is-hot');
      d.snappedSlot = slot;
    }

    this.ghostEl.style.transform = `translate3d(${d.target.x}px, ${d.target.y}px, 0)`;
    this.ghostEl.classList.add('is-visible');
    this.updateRay(d.card, free);

    if (edgeX || edgeY) this.requestFrame();
  };

  private finishDrag(cancelled: boolean): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    if (!d.moved) return;

    const free = this.freePosition(d);
    const final = cancelled ? d.origin : d.target;

    // FLIP: commit the final position, then animate from where the card was released
    d.card.classList.remove('is-lifted');
    this.place(d.card, final);
    this.setOffset(d.card, free.x - final.x, free.y - final.y);
    void d.card.offsetWidth;
    d.card.classList.add('is-settling');
    this.setOffset(d.card, 0, 0);
    window.setTimeout(() => d.card.classList.remove('is-settling'), 220);

    this.worldEl.classList.remove('is-arranging');
    this.ghostEl.classList.remove('is-visible');
    if (d.snappedSlot >= 0) this.slotEls[d.snappedSlot].classList.remove('is-hot');

    if (!cancelled) {
      this.saved[d.card.id] = final;
      this.persist();
    }
    // The dropped card keeps its spot; anything it might now touch makes room
    this.resolveOverlaps(d.card.id);
  }

  // ---------------------------------------------------------------------------
  // Geometry
  // ---------------------------------------------------------------------------

  private toWorld(clientX: number, clientY: number): Point {
    const rect = this.host.getViewport().getBoundingClientRect();
    const pan = this.host.getPan();
    const zoom = this.host.getZoom();
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  }

  // Where the card would sit if it followed the pointer exactly
  private freePosition(d: DragSession): Point {
    const pointer = this.toWorld(d.lastClientX, d.lastClientY);
    return { x: pointer.x - d.grab.x, y: pointer.y - d.grab.y };
  }

  // Visual offset from the committed left/top (applied via CSS var so hover rules can't reset it)
  private setOffset(card: HTMLElement, dx: number, dy: number): void {
    if (dx === 0 && dy === 0) {
      card.style.removeProperty('--drag-offset');
    } else {
      card.style.setProperty('--drag-offset', `translate3d(${dx}px, ${dy}px, 0)`);
    }
  }

  private snap(p: Point, size: { w: number; h: number }): { point: Point; slot: number } {
    let best = -1;
    let bestDist = SNAP_RADIUS;
    SLOTS.forEach((s, i) => {
      const dist = Math.hypot(p.x + size.w / 2 - s.x, p.y - s.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    if (best >= 0) {
      return { point: { x: Math.round(SLOTS[best].x - size.w / 2), y: SLOTS[best].y }, slot: best };
    }
    return { point: { x: Math.round(p.x / GRID) * GRID, y: Math.round(p.y / GRID) * GRID }, slot: -1 };
  }

  private clamp(p: Point, size: { w: number; h: number }): Point {
    return {
      x: Math.min(Math.max(0, p.x), Math.max(0, Math.max(WORLD_W, this.worldEl.offsetWidth) - size.w)),
      y: Math.min(Math.max(0, p.y), Math.max(0, Math.max(WORLD_H, this.worldEl.offsetHeight) - size.h)),
    };
  }

  private collides(p: Point, size: { w: number; h: number }, obstacles: Rect[]): boolean {
    for (const o of obstacles) {
      if (p.x < o.x + o.w + GAP && p.x + size.w + GAP > o.x && p.y < o.y + o.h + GAP && p.y + size.h + GAP > o.y) {
        return true;
      }
    }
    return false;
  }

  // Nearest non-overlapping position: candidates are the desired coordinate plus every
  // position flush against an obstacle edge, which covers all "tight" spots.
  private findFreeSpot(desired: Point, size: { w: number; h: number }, obstacles: Rect[]): Point {
    const want = this.clamp(desired, size);
    if (!this.collides(want, size, obstacles)) return want;

    const xs = [want.x];
    const ys = [want.y];
    for (const o of obstacles) {
      xs.push(o.x + o.w + GAP, o.x - GAP - size.w);
      ys.push(o.y + o.h + GAP, o.y - GAP - size.h);
    }

    let best: Point | null = null;
    let bestDist = Infinity;
    for (const x of xs) {
      for (const y of ys) {
        const c = this.clamp({ x, y }, size);
        const dist = Math.hypot(c.x - want.x, c.y - want.y);
        if (dist >= bestDist || this.collides(c, size, obstacles)) continue;
        best = c;
        bestDist = dist;
      }
    }
    // World is full around here: allow spilling below the board rather than overlapping
    if (!best) {
      const bottom = obstacles.reduce((m, o) => Math.max(m, o.y + o.h), 0);
      best = { x: want.x, y: bottom + GAP };
    }
    return best;
  }

  private isVisible(el: HTMLElement): boolean {
    return el.offsetWidth > 0 && el.offsetHeight > 0;
  }

  private rectOf(el: HTMLElement): Rect {
    const p = this.positions.get(el.id) ?? { x: el.offsetLeft, y: el.offsetTop };
    return { x: p.x, y: p.y, w: el.offsetWidth, h: el.offsetHeight };
  }

  private collectObstacles(except: HTMLElement): Rect[] {
    const rects: Rect[] = [];
    this.fixed.forEach((el) => {
      if (this.isVisible(el)) rects.push(this.rectOf(el));
    });
    this.cards.forEach((card) => {
      if (card !== except && this.isVisible(card)) rects.push(this.rectOf(card));
    });
    return rects;
  }

  private readPosition(card: HTMLElement): Point {
    return this.positions.get(card.id) ?? { x: card.offsetLeft, y: card.offsetTop };
  }

  private place(card: HTMLElement, p: Point): void {
    this.positions.set(card.id, p);
    card.style.left = `${p.x}px`;
    card.style.top = `${p.y}px`;
    this.updateRay(card, p);
  }

  private updateRay(card: HTMLElement, p: Point): void {
    const ray = document.getElementById(`ray-${card.id.replace('card-', '')}`);
    if (!ray) return;
    ray.setAttribute('x1', String(RAY_ORIGIN.x));
    ray.setAttribute('y1', String(RAY_ORIGIN.y));
    ray.setAttribute('x2', String(Math.round(p.x + card.offsetWidth / 2)));
    ray.setAttribute('y2', String(Math.round(p.y + card.offsetHeight / 2)));
  }

  private positionSlotMarkers(width: number): void {
    SLOTS.forEach((s, i) => {
      const el = this.slotEls[i];
      el.style.width = `${width}px`;
      el.style.transform = `translate3d(${s.x - width / 2}px, ${s.y}px, 0)`;
    });
  }

  // ---------------------------------------------------------------------------
  // Overlap resolution (cards grow, unlock, or the viewport switches to mobile widths)
  // ---------------------------------------------------------------------------

  private requestResolve(): void {
    if (this.resolveRequested) return;
    this.resolveRequested = true;
    window.requestAnimationFrame(() => {
      this.resolveRequested = false;
      if (!this.drag) this.resolveOverlaps();
    });
  }

  private resolveOverlaps(keepId?: string): void {
    const placed: Rect[] = [];
    let dirty = false;
    this.fixed.forEach((el) => {
      if (this.isVisible(el)) placed.push(this.rectOf(el));
    });

    // Priority: the card just dropped, then cards whose size did not change (they were here first),
    // then cards that just appeared or grew — those are the ones that move.
    const visible = [...this.cards.values()].filter((c) => this.isVisible(c));
    const changed = (c: HTMLElement): number => {
      const prev = this.lastSizes.get(c.id);
      if (!prev) return 2;
      return prev.w !== c.offsetWidth || prev.h !== c.offsetHeight ? 1 : 0;
    };
    const rank = new Map(visible.map((c) => [c.id, c.id === keepId ? -1 : changed(c)]));
    visible.sort((a, b) => rank.get(a.id)! - rank.get(b.id)! || DRAGGABLE_IDS.indexOf(a.id) - DRAGGABLE_IDS.indexOf(b.id));

    visible.forEach((card) => {
      const r = this.rectOf(card);
      const size = { w: r.w, h: r.h };
      const spot = this.findFreeSpot({ x: r.x, y: r.y }, size, placed);
      const moved = spot.x !== r.x || spot.y !== r.y;
      if (moved) {
        card.classList.add('is-settling');
        window.setTimeout(() => card.classList.remove('is-settling'), 220);
        // Persist so the arrangement is stable across reloads
        this.saved[card.id] = spot;
        dirty = true;
      }
      if (moved || !this.positions.has(card.id)) {
        this.place(card, spot);
      } else {
        this.updateRay(card, spot);
      }
      placed.push({ ...spot, ...size });
      this.lastSizes.set(card.id, size);
    });

    this.cards.forEach((card, id) => {
      if (!this.isVisible(card)) this.lastSizes.delete(id);
    });
    // Long cards may spill beyond the original board. Extend camera bounds so their
    // last rows remain reachable, without shrinking the world when a card is minimized.
    const width = Math.max(WORLD_W, this.worldEl.offsetWidth, ...placed.map(r => r.x + r.w + GAP));
    const height = Math.max(WORLD_H, this.worldEl.offsetHeight, ...placed.map(r => r.y + r.h + GAP));
    this.worldEl.style.width = `${width}px`;
    this.worldEl.style.height = `${height}px`;
    if (dirty) this.persist();
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private loadSaved(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, Point>;
      Object.entries(parsed).forEach(([id, p]) => {
        if (this.cards.has(id) && Number.isFinite(p?.x) && Number.isFinite(p?.y)) {
          this.saved[id] = { x: p.x, y: p.y };
        }
      });
    } catch {
      // Ignore localStorage errors
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.saved));
    } catch {
      // Ignore localStorage errors
    }
  }
}
