import { GameStateManager } from '../core/GameState.js';
import { events, GameEvents } from '../core/EventBus.js';
import { formatNumber } from '../systems/calculations.js';
import { compareChurchScenes, describeChurchScene, type ChurchSceneDescription, type ChurchSnapshot, type ChurchTier, type RestoredTier } from '../features/church/churchScene.js';
import { CHURCH_DETAILS, RESTORATION_NOTICES, type ChurchDetail, type ChurchNotice } from '../config/church.js';
import { isArtReview } from './artReview.js';
import { paintPixelSphere } from './pixelSphere.js';
import { STAGE_SIZE } from '../features/church/churchConfig.js';
import { ChurchYard } from './ChurchYard.js';

type ArtScene = `tier-${ChurchTier}` | 'procession';
const PLEA_SECONDS = 15;
/** A point on the 400×192 stage, as % of its width and height. */
type StagePoint = [left: number, top: number];

const TIER_TEXT: Record<ChurchTier, { title: string; status: string; caption: string }> = {
  0: { title: 'A Igreja em Ruínas', status: 'Uma luz fraca entre os escombros', caption: 'Algo ainda brilha onde ninguém reza.' },
  1: { title: 'O Altar Improvisado', status: 'A Esfera repousa no altar', caption: 'Os escombros foram retirados. O culto tem um lugar.' },
  2: { title: 'A Capela das Velas', status: 'Velas ardem atrás das janelas', caption: 'O telhado voltou. A chama do Fervor aquece as paredes.' },
  3: { title: 'O Santuário Restaurado', status: 'Os vitrais brilham na noite', caption: 'O sino chama. Ninguém mais esquece este lugar.' }
};

/** Where the restoration sparkles land on the 400×192 stage, as % of its width and height. */
const RESTORED_PARTS: Record<RestoredTier, StagePoint[]> = {
  1: [[27, 66], [33, 63], [58, 78], [64, 76]],
  2: [[37, 45], [47, 37], [59, 42], [33, 60], [40, 59], [46, 58], [59, 63]],
  3: [[58, 23], [59, 43], [33, 60], [40, 59], [46, 58], [54, 59], [64, 59]]
};

/**
 * Where each detail prop stands on the stage: the bottom centre of the sprite.
 * The stage crops differently per viewport; only x 22–78% (and feet up to about 76%) stay visible everywhere.
 * Props line the front of the yard and draw over it: the low pews and garden hide the legs of the followers
 * behind them rather than the other way round, so every unlocked prop shows with all 12 followers present.
 */
const DETAIL_PROPS: Record<ChurchDetail, { sprite: string; spriteWidth: number; spots: StagePoint[] }> = {
  torches: { sprite: 'torch', spriteWidth: 24, spots: [[55.5, 76.5], [62.5, 76.5]] },
  pews: { sprite: 'pews', spriteWidth: 64, spots: [[53, 76.5]] },
  garden: { sprite: 'garden', spriteWidth: 64, spots: [[67, 76.5]] },
  banner: { sprite: 'banner', spriteWidth: 32, spots: [[50.5, 76.5]] },
  statue: { sprite: 'statue', spriteWidth: 32, spots: [[76, 76.5]] }
};

/** Prop sprite pixels per background pixel: PixelLab fills the whole canvas, so 1:1 props dwarf the church door. */
const PROP_SCALE = 0.5;

/** Sparkle offsets around a newly unlocked prop's bottom centre. */
const DETAIL_SPARKLES: StagePoint[] = [[-2, -3], [2, -6], [0, -10]];

const TRANSITION_MS = 1400;
const SPARKLE_STAGGER_MS = 90;
/** Sparkles start once the dust cloud has risen over the old background. */
const SPARKLE_START_MS = 300;

export function churchSnapshot(gameState: GameStateManager): ChurchSnapshot {
  return {
    selos: {
      incarnation: gameState.isIncarnationUnlocked(),
      fervor: gameState.isFervorUpgradesUnlocked(),
      relics: gameState.isRelicsUnlocked()
    },
    incarnationStage: gameState.incarnationStage,
    followers: gameState.getTotalFollowersCount(),
    blessingSeconds: gameState.incarnationBoostTimer
  };
}

/** Main gameplay scene: the church is drawn straight from its description, so loading a save needs no replay. */
export class ChurchScene {
  private scene: ChurchSceneDescription | null = null;
  private reviewTier: ChurchTier | null = null;
  private reviewFollowers: number | null = null;
  private props = new Map<ChurchDetail, HTMLImageElement[]>();
  private pulseTimer: number | undefined;
  private miracleTimer: number | undefined;
  private pleaCooldown = 5;
  /** From the moment a follower sets off for the altar until the request is granted, expires or they leave. */
  private pleaOpen = false;
  /** Counts down only once the follower is praying at the altar, so the walk never shortens the window. */
  private pleaRemaining = 0;
  /** Art-review has no game loop, so a previewed request expires on a plain timer. */
  private reviewPleaTimer: number | undefined;
  private yard = new ChurchYard(document.getElementById('church-followers')!);
  private world = document.getElementById('church-world')!;
  private stage = document.getElementById('church-stage')!;
  private background = document.getElementById('church-background') as HTMLImageElement;
  private sphere = document.getElementById('church-sphere') as HTMLButtonElement;
  private blessing = document.getElementById('church-blessing') as HTMLButtonElement;
  private blessingLabel = document.getElementById('church-blessing-label')!;

  constructor(
    private gameState: GameStateManager,
    onSphereClick: (event: MouseEvent) => void,
    private grantMiracle: (x: number, y: number) => number,
    invokeBlessing: (x: number, y: number) => void,
    private announce: (notice: ChurchNotice, tag: string) => void
  ) {
    paintPixelSphere(this.sphere.querySelector('canvas')!);
    this.buildDetailProps();
    this.sphere.addEventListener('click', onSphereClick);
    // Native button: Enter and Space arrive here as clicks, so feedback is anchored to the button, not the pointer.
    this.blessing.addEventListener('click', () => {
      const rect = this.blessing.getBoundingClientRect();
      invokeBlessing(rect.x + rect.width / 2, rect.y);
      this.pulse();
    });
    this.world.classList.toggle('scene-paused', document.hidden);
    this.trackHud();
    if (isArtReview) {
      document.body.classList.add('art-review');
      document.getElementById('art-review-controls')!.hidden = false;
      document.querySelectorAll<HTMLButtonElement>('[data-art-scene]').forEach(button => {
        button.addEventListener('click', () => this.setArtScene(button.dataset.artScene as ArtScene));
      });
      document.querySelectorAll<HTMLButtonElement>('[data-art-followers]').forEach(button => {
        button.addEventListener('click', () => this.setReviewFollowers(Number(button.dataset.artFollowers)));
      });
      document.getElementById('art-review-plea')!.addEventListener('click', () => this.offerMiracle());
      this.setReviewFollowers(4);
      document.querySelectorAll<HTMLButtonElement>('[data-art-details]').forEach(button => {
        button.addEventListener('click', () => this.setArtDetails(Number(button.dataset.artDetails)));
      });
      this.setArtScene('tier-0');
    }
    events.on(GameEvents.STATE_CHANGED, () => this.sync());
    events.on(GameEvents.FAITH_CHANGED, () => this.pulse());
    events.on(GameEvents.MIRACLE_GRANTED, () => this.miracle());
    events.on(GameEvents.MIRACLE_PLEA, () => this.offerMiracle());
    events.on<number>(GameEvents.GAME_TICK, delta => {
      this.sync();
      if (isArtReview || document.hidden || !document.getElementById('gameplay-screen')!.classList.contains('active')) return;
      if (this.pleaOpen) {
        if (this.pleaRemaining <= 0) return;
        this.pleaRemaining -= delta;
        if (this.pleaRemaining <= 0) this.endRequest();
      } else if (this.gameState.getTotalFollowersCount() > 0) {
        this.pleaCooldown -= delta;
        if (this.pleaCooldown <= 0) this.offerMiracle();
      }
    });
    document.addEventListener('visibilitychange', () => {
      this.world.classList.toggle('scene-paused', document.hidden);
    });
    this.sync();
  }

  /** Keeps `--hud-bottom` at how far the HUD's boxes reach into the world, so the stage can sit below them. */
  private trackHud(): void {
    const hud = document.querySelector('.top-hud-bar');
    if (!hud) return;
    const update = () => {
      const top = this.world.getBoundingClientRect().top + this.world.clientTop;
      let bottom = top;
      for (const box of hud.children) {
        const rect = box.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) bottom = Math.max(bottom, rect.bottom);
      }
      this.world.style.setProperty('--hud-bottom', `${Math.round(bottom - top)}px`);
    };
    const observer = new ResizeObserver(update);
    observer.observe(this.world);
    observer.observe(hud);
    for (const box of hud.children) observer.observe(box);
    update();
  }

  private setArtScene(artScene: ArtScene): void {
    document.querySelectorAll<HTMLButtonElement>('[data-art-scene]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.artScene === artScene));
    });
    const procession = artScene === 'procession';
    this.world.hidden = procession;
    document.getElementById('procession-world')!.hidden = !procession;
    document.querySelectorAll<HTMLElement>('.procession-review-only').forEach(control => { control.hidden = !procession; });
    document.querySelectorAll<HTMLElement>('.church-review-only').forEach(control => { control.hidden = procession; });
    if (!procession) {
      this.reviewTier = Number(artScene.slice('tier-'.length)) as ChurchTier;
      this.sync();
    }
  }

  private setReviewFollowers(followers: number): void {
    this.reviewFollowers = followers;
    this.markReviewControls(followers);
    this.sync();
  }

  /** The follower and detail controls both set the review follower count, so each reflects it. */
  private markReviewControls(followers: number): void {
    const details = CHURCH_DETAILS.filter(unlock => followers >= unlock.followers).length;
    document.querySelectorAll<HTMLButtonElement>('[data-art-followers]').forEach(button => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.artFollowers) === followers));
    });
    document.querySelectorAll<HTMLButtonElement>('[data-art-details]').forEach(button => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.artDetails) === details));
    });
  }

  /** Redraws from current state as a fresh load would, so an imported save replays nothing. */
  rebuild(): void {
    this.scene = null;
    this.sync();
  }

  /** Steps art-review through the details: 0 shows none, n shows the first n by follower threshold. */
  private setArtDetails(count: number): void {
    this.setReviewFollowers(count === 0 ? 0 : CHURCH_DETAILS[count - 1].followers);
  }

  private buildDetailProps(): void {
    const props = (Object.entries(DETAIL_PROPS) as Array<[ChurchDetail, (typeof DETAIL_PROPS)[ChurchDetail]]>).flatMap(([detail, { sprite, spriteWidth, spots }]) => {
      const images = spots.map(([left, top]) => {
        const prop = document.createElement('img');
        prop.className = 'church-prop';
        prop.dataset.detail = detail;
        prop.src = `/assets/church/props/${sprite}.png`;
        prop.alt = '';
        prop.hidden = true;
        prop.style.left = `${left}%`;
        // `top` is where the prop's feet rest: the CSS lifts the sprite by its full height.
        prop.style.top = `${top}%`;
        prop.style.width = `${(spriteWidth * PROP_SCALE * 100) / STAGE_SIZE.width}%`;
        // A detail lost and regained (art-review stepping back) should rise again only through a new unlock.
        prop.addEventListener('animationend', () => prop.classList.remove('church-prop-new'));
        return { prop, top };
      });
      this.props.set(detail, images.map(({ prop }) => prop));
      return images;
    });
    // Props standing lower on the hill are nearer the viewer, so they draw on top.
    this.background.after(...props.sort((a, b) => a.top - b.top).map(({ prop }) => prop));
  }

  private sync(): void {
    const snapshot = churchSnapshot(this.gameState);
    if (this.reviewTier !== null) {
      snapshot.selos = { incarnation: this.reviewTier >= 1, fervor: this.reviewTier >= 2, relics: this.reviewTier >= 3 };
    }
    if (this.reviewFollowers !== null) snapshot.followers = this.reviewFollowers;
    const next = describeChurchScene(snapshot);
    document.getElementById('church-count')!.textContent = `${formatNumber(snapshot.followers)} fiéis`;
    this.blessing.hidden = !next.blessing.visible;
    this.blessing.style.setProperty('--blessing-fill', String(next.blessing.fill));
    this.blessing.classList.toggle('active', snapshot.blessingSeconds > 0);
    this.blessingLabel.textContent = `✦ 2× · ${Math.ceil(snapshot.blessingSeconds)}s`;
    if (next.filledSpots !== this.scene?.filledSpots) {
      this.yard.fill(next.filledSpots);
      if (this.pleaOpen && !this.yard.hasRequest) {
        this.pleaOpen = false;
        this.resetPleaTimers();
      }
    }
    // The first build (page load) has nothing to compare against, so it never replays a transition.
    const changes = this.scene ? compareChurchScenes(this.scene, next) : [];
    // Ticks resync constantly; skip the redraw unless something drawn differs (losing a detail is no reported change).
    if (this.scene && this.scene.tier === next.tier && this.scene.details.join() === next.details.join()) {
      this.scene = next;
      return;
    }
    for (const change of changes) {
      if (change.kind === 'tier' && change.to > change.from) {
        // Going up means the target is never the starting ruin.
        const restored = change.to as RestoredTier;
        this.playRestoration(restored);
        this.announce(RESTORATION_NOTICES[restored], 'RESTAURAÇÃO');
      } else if (change.kind === 'detail') {
        this.props.get(change.detail)!.forEach(prop => prop.classList.add('church-prop-new'));
        this.playSparkles(DETAIL_PROPS[change.detail].spots.flatMap(([left, top]) => DETAIL_SPARKLES.map(([dx, dy]): StagePoint => [left + dx, top + dy])));
        this.announce(CHURCH_DETAILS.find(({ detail }) => detail === change.detail)!.notice, 'OFERENDA DOS FIÉIS');
      }
    }
    this.scene = next;
    this.world.dataset.churchTier = String(next.tier);
    this.sphere.dataset.location = next.sphereLocation;
    this.background.src = `/assets/church/tier-${next.tier}.png`;
    for (const [detail, props] of this.props) {
      const unlocked = next.details.includes(detail);
      props.forEach(prop => { prop.hidden = !unlocked; });
    }
    const text = TIER_TEXT[next.tier];
    document.getElementById('church-title')!.textContent = text.title;
    document.getElementById('church-status')!.textContent = text.status;
    document.getElementById('church-caption')!.textContent = text.caption;
  }

  /** Fades the old background out through a dust cloud and sparkles over the parts that were restored. */
  private playRestoration(tier: RestoredTier): void {
    const outgoing = this.background.cloneNode() as HTMLImageElement;
    outgoing.removeAttribute('id');
    outgoing.classList.add('church-background-outgoing');
    const dust = document.createElement('div');
    dust.className = 'church-dust';
    this.background.after(outgoing, dust);
    // The gutter colours belong to the old tier too: fade a copy of the backdrop out with the old background.
    const backdrop = this.world.querySelector<HTMLElement>('.church-backdrop')!;
    const outgoingBackdrop = backdrop.cloneNode() as HTMLElement;
    const colours = getComputedStyle(this.world);
    for (const edge of ['--edge-left', '--edge-right']) outgoingBackdrop.style.setProperty(edge, colours.getPropertyValue(edge));
    outgoingBackdrop.classList.add('church-backdrop-outgoing');
    backdrop.after(outgoingBackdrop);
    window.setTimeout(() => { outgoing.remove(); outgoingBackdrop.remove(); dust.remove(); }, TRANSITION_MS);
    this.playSparkles(RESTORED_PARTS[tier], SPARKLE_START_MS);
  }

  /** Staggered sparkles over the given stage points. */
  private playSparkles(points: StagePoint[], startMs = 0): void {
    const sparkles = points.map(([left, top], index) => {
      const sparkle = document.createElement('span');
      sparkle.className = 'church-sparkle';
      sparkle.textContent = '✦';
      sparkle.style.left = `${left}%`;
      sparkle.style.top = `${top}%`;
      sparkle.style.animationDelay = `${startMs + index * SPARKLE_STAGGER_MS}ms`;
      return sparkle;
    });
    this.stage.append(...sparkles);
    window.setTimeout(() => sparkles.forEach(node => node.remove()), TRANSITION_MS + sparkles.length * SPARKLE_STAGGER_MS);
  }

  private pulse(): void {
    // Frequent clicks retarget one brief response instead of accumulating particles.
    window.clearTimeout(this.pulseTimer);
    this.world.classList.add('faith-response');
    this.pulseTimer = window.setTimeout(() => this.world.classList.remove('faith-response'), 120);
  }

  private miracle(): void {
    window.clearTimeout(this.miracleTimer);
    this.world.classList.add('miracle-active');
    this.miracleTimer = window.setTimeout(() => this.world.classList.remove('miracle-active'), 1400);
  }

  private offerMiracle(): void {
    if (this.pleaOpen || this.world.hidden) return;
    this.pleaOpen = this.yard.request(
      () => {
        this.pleaRemaining = PLEA_SECONDS;
        if (isArtReview) this.reviewPleaTimer = window.setTimeout(() => this.endRequest(), PLEA_SECONDS * 1000);
      },
      (x, y) => {
        this.endRequest();
        this.grantMiracle(x, y);
      }
    );
    if (this.pleaOpen) this.world.classList.add('miracle-request');
    else this.resetPleaTimers();
  }

  /** The request ends, granted or expired: the follower walks back to their spot. */
  private endRequest(): void {
    this.yard.release();
    this.pleaOpen = false;
    this.resetPleaTimers();
  }

  private resetPleaTimers(): void {
    window.clearTimeout(this.reviewPleaTimer);
    this.pleaRemaining = 0;
    this.pleaCooldown = 35 + Math.random() * 30;
    this.world.classList.remove('miracle-request');
  }
}
