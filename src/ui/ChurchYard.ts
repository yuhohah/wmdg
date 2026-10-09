import { ALTAR_STAND, ALTAR_X, FOLLOWER_SPOTS, FOLLOWER_WALK_SPEED, STAGE_SIZE, type FollowerSpot, type YardPoint } from '../features/church/churchConfig.js';

type Pose = 'idle' | 'walk' | 'pray';
interface Walk { animation: Animation; from: YardPoint; duration: number }

const POSE_STRIP: Record<Pose, (follower: number) => string> = {
  idle: follower => `/assets/church/followers/follower-${follower}-idle.png`,
  walk: follower => `/assets/procession/walk/follower-${follower}-walk.png`,
  pray: follower => `/assets/church/followers/follower-${follower}-pray.png`
};
const POSE_DURATION: Record<Pose, number> = { idle: 2400, walk: 900, pray: 3000 };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

class YardFollower {
  readonly element = document.createElement('div');
  private strip = document.createElement('img');
  private walk: Walk | null = null;
  /** Where the follower stands, or where they are heading while walking. */
  private position: YardPoint;

  constructor(readonly spot: FollowerSpot, index: number) {
    this.position = spot;
    this.element.className = 'church-follower';
    const viewport = document.createElement('span');
    viewport.className = 'church-follower-sprite';
    viewport.setAttribute('aria-hidden', 'true');
    this.strip.alt = '';
    // Offset each loop so neighbours never breathe in unison.
    this.strip.style.animationDelay = `${-(index * 617) % POSE_DURATION.idle}ms`;
    viewport.append(this.strip);
    this.element.append(viewport);
    this.place(spot);
    this.face(ALTAR_X);
    this.pose('idle');
  }

  /** Walks to the altar stand; `arrived` fires once they are praying there. */
  goToAltar(arrived: () => void): void {
    this.walkTo(ALTAR_STAND, () => {
      this.face(ALTAR_X);
      this.pose('pray');
      arrived();
    });
  }

  goHome(): void {
    this.walkTo(this.spot, () => {
      this.face(ALTAR_X);
      this.pose('idle');
    });
  }

  remove(): void {
    this.walk?.animation.cancel();
    this.element.remove();
  }

  private walkTo(target: YardPoint, done: () => void): void {
    const from = this.currentPosition();
    this.walk?.animation.cancel();
    this.walk = null;
    this.position = from;
    this.place(from);
    this.face(target.x);
    this.pose('walk');
    const distance = Math.hypot(target.x - from.x, target.feet - from.feet);
    const duration = reducedMotion.matches ? 0 : (distance / FOLLOWER_WALK_SPEED) * 1000;
    const animation = this.element.animate(
      [{ left: percentX(from.x), top: percentY(from.feet) }, { left: percentX(target.x), top: percentY(target.feet) }],
      { duration, easing: 'linear' }
    );
    const walk = { animation, from, duration };
    this.walk = walk;
    this.position = target;
    animation.addEventListener('finish', () => {
      if (this.walk !== walk) return;
      this.walk = null;
      this.place(target);
      done();
    });
  }

  /** Where the follower stands right now, even halfway through a walk (and while the scene is hidden). */
  private currentPosition(): YardPoint {
    if (!this.walk || this.walk.duration === 0) return this.position;
    const { animation, from, duration } = this.walk;
    const progress = Math.min(1, Number(animation.currentTime ?? 0) / duration);
    return {
      x: from.x + (this.position.x - from.x) * progress,
      feet: from.feet + (this.position.feet - from.feet) * progress
    };
  }

  private place(point: YardPoint): void {
    this.element.style.left = percentX(point.x);
    this.element.style.top = percentY(point.feet);
    this.element.style.zIndex = String(Math.round(point.feet));
  }

  /** The art faces right; mirror it whenever the target is to the follower's left. */
  private face(targetX: number): void {
    this.element.dataset.facing = targetX < this.currentPosition().x ? 'left' : 'right';
  }

  private pose(pose: Pose): void {
    this.element.dataset.pose = pose;
    this.strip.src = POSE_STRIP[pose](this.spot.follower);
    this.strip.style.animationDuration = `${POSE_DURATION[pose]}ms`;
  }
}

function percentX(x: number): string {
  return `${(x / STAGE_SIZE.width) * 100}%`;
}

function percentY(feet: number): string {
  return `${(feet / STAGE_SIZE.height) * 100}%`;
}

/** Followers standing in the church-yard spots, and the one bringing a miracle request to the altar. */
export class ChurchYard {
  private followers: YardFollower[] = [];
  private supplicant: YardFollower | null = null;
  private pleaButton: HTMLButtonElement | null = null;

  constructor(private layer: HTMLElement) {}

  /** Shows the first `filledSpots` spots; a request from a follower who leaves is dropped. */
  fill(filledSpots: number): void {
    while (this.followers.length > filledSpots) {
      const follower = this.followers.pop()!;
      if (follower === this.supplicant) this.dismiss();
      follower.remove();
    }
    while (this.followers.length < filledSpots) {
      const index = this.followers.length;
      const follower = new YardFollower(FOLLOWER_SPOTS[index], index);
      this.followers.push(follower);
      this.layer.append(follower.element);
    }
  }

  get hasRequest(): boolean {
    return this.supplicant !== null;
  }

  /**
   * Sends a random follower to the altar. Once they kneel, a request appears that grants
   * the miracle when clicked. Returns false when nobody is in the yard to ask.
   */
  request(arrived: () => void, grant: (x: number, y: number) => void): boolean {
    if (this.supplicant || this.followers.length === 0) return false;
    const supplicant = this.followers[Math.floor(Math.random() * this.followers.length)];
    this.supplicant = supplicant;
    supplicant.goToAltar(() => {
      if (this.supplicant !== supplicant) return;
      const button = document.createElement('button');
      button.className = 'miracle-plea church-plea';
      button.type = 'button';
      button.textContent = '✦ ATENDER PRECE';
      button.setAttribute('aria-label', 'Atender prece do fiel e conceder um milagre');
      button.addEventListener('click', event => grant(event.clientX, event.clientY));
      supplicant.element.append(button);
      this.pleaButton = button;
      arrived();
    });
    return true;
  }

  /** Ends the current request, granted or expired, and sends the follower back to their spot. */
  release(): void {
    const supplicant = this.supplicant;
    this.dismiss();
    supplicant?.goHome();
  }

  private dismiss(): void {
    this.pleaButton?.remove();
    this.pleaButton = null;
    this.supplicant = null;
  }
}
