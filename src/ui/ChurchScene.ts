import { GameStateManager } from '../core/GameState.js';
import { events, GameEvents } from '../core/EventBus.js';
import { formatNumber } from '../systems/calculations.js';
import { compareChurchScenes, describeChurchScene, type ChurchSceneDescription, type ChurchSnapshot, type ChurchTier, type RestoredTier } from '../features/church/churchScene.js';
import { RESTORATION_NOTICES, type RestorationNotice } from '../config/church.js';
import { isArtReview } from './artReview.js';
import { paintPixelSphere } from './pixelSphere.js';

type ArtScene = `tier-${ChurchTier}` | 'procession';

const TIER_TEXT: Record<ChurchTier, { title: string; status: string; caption: string }> = {
  0: { title: 'A Igreja em Ruínas', status: 'Uma luz fraca entre os escombros', caption: 'Algo ainda brilha onde ninguém reza.' },
  1: { title: 'O Altar Improvisado', status: 'A Esfera repousa no altar', caption: 'Os escombros foram retirados. O culto tem um lugar.' },
  2: { title: 'A Capela das Velas', status: 'Velas ardem atrás das janelas', caption: 'O telhado voltou. A chama do Fervor aquece as paredes.' },
  3: { title: 'O Santuário Restaurado', status: 'Os vitrais brilham na noite', caption: 'O sino chama. Ninguém mais esquece este lugar.' }
};

/** Where the restoration sparkles land on the 400×192 stage, as % of its width and height. */
const RESTORED_PARTS: Record<RestoredTier, Array<[number, number]>> = {
  1: [[27, 66], [33, 63], [58, 78], [64, 76]],
  2: [[37, 45], [47, 37], [59, 42], [33, 60], [40, 59], [46, 58], [59, 63]],
  3: [[58, 23], [59, 43], [33, 60], [40, 59], [46, 58], [54, 59], [64, 59]]
};

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
  private pulseTimer: number | undefined;
  private miracleTimer: number | undefined;
  private pleaCooldown = 5;
  private pleaRemaining = 0;
  private pleaButton: HTMLButtonElement | null = null;
  private world = document.getElementById('church-world')!;
  private background = document.getElementById('church-background') as HTMLImageElement;
  private sphere = document.getElementById('church-sphere') as HTMLButtonElement;
  private blessing = document.getElementById('church-blessing') as HTMLButtonElement;
  private blessingLabel = document.getElementById('church-blessing-label')!;
  private stage = document.getElementById('church-stage')!;

  constructor(
    private gameState: GameStateManager,
    onSphereClick: (event: MouseEvent) => void,
    private grantMiracle: (x: number, y: number) => number,
    invokeBlessing: (x: number, y: number) => void,
    private announce: (notice: RestorationNotice) => void
  ) {
    paintPixelSphere(this.sphere.querySelector('canvas')!);
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
      this.setArtScene('tier-0');
    }
    events.on(GameEvents.STATE_CHANGED, () => this.sync());
    events.on(GameEvents.FAITH_CHANGED, () => this.pulse());
    events.on(GameEvents.MIRACLE_GRANTED, () => this.miracle());
    events.on(GameEvents.MIRACLE_PLEA, () => this.offerMiracle());
    events.on<number>(GameEvents.GAME_TICK, delta => {
      this.sync();
      if (isArtReview || document.hidden || !document.getElementById('gameplay-screen')!.classList.contains('active')) return;
      if (this.pleaRemaining > 0) {
        this.pleaRemaining -= delta;
        if (this.pleaRemaining <= 0) this.clearPlea();
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
    if (!procession) {
      this.reviewTier = Number(artScene.slice('tier-'.length)) as ChurchTier;
      this.sync();
    }
  }

  private sync(): void {
    const snapshot = churchSnapshot(this.gameState);
    if (this.reviewTier !== null) {
      snapshot.selos = { incarnation: this.reviewTier >= 1, fervor: this.reviewTier >= 2, relics: this.reviewTier >= 3 };
    }
    const next = describeChurchScene(snapshot);
    document.getElementById('church-count')!.textContent = `${formatNumber(this.gameState.getTotalFollowersCount())} fiéis`;
    this.blessing.hidden = !next.blessing.visible;
    this.blessing.style.setProperty('--blessing-fill', String(next.blessing.fill));
    this.blessing.classList.toggle('active', snapshot.blessingSeconds > 0);
    this.blessingLabel.textContent = `✦ 2× · ${Math.ceil(snapshot.blessingSeconds)}s`;
    // The first build (page load) has nothing to compare against, so it never replays a transition.
    const changes = this.scene ? compareChurchScenes(this.scene, next) : [];
    if (this.scene && changes.length === 0) return;
    for (const change of changes) {
      if (change.kind === 'tier' && change.to > change.from) {
        // Going up means the target is never the starting ruin.
        const restored = change.to as RestoredTier;
        this.playRestoration(restored);
        this.announce(RESTORATION_NOTICES[restored]);
      }
    }
    this.scene = next;
    this.world.dataset.churchTier = String(next.tier);
    this.sphere.dataset.location = next.sphereLocation;
    this.background.src = `/assets/church/tier-${next.tier}.png`;
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
    const sparkles = RESTORED_PARTS[tier].map(([left, top], index) => {
      const sparkle = document.createElement('span');
      sparkle.className = 'church-sparkle';
      sparkle.textContent = '✦';
      sparkle.style.left = `${left}%`;
      sparkle.style.top = `${top}%`;
      sparkle.style.animationDelay = `${SPARKLE_START_MS + index * SPARKLE_STAGGER_MS}ms`;
      return sparkle;
    });
    this.background.after(outgoing, dust, ...sparkles);
    window.setTimeout(() => [outgoing, dust, ...sparkles].forEach(node => node.remove()), TRANSITION_MS + sparkles.length * SPARKLE_STAGGER_MS);
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
    if (this.pleaButton || this.world.hidden || this.gameState.getTotalFollowersCount() < 1) return;
    const button = document.createElement('button');
    button.className = 'miracle-plea church-plea';
    button.type = 'button';
    button.textContent = '✦ ATENDER PRECE';
    button.setAttribute('aria-label', 'Atender prece do fiel e conceder um milagre');
    button.addEventListener('click', event => {
      this.clearPlea();
      this.grantMiracle(event.clientX, event.clientY);
    });
    this.stage.append(button);
    this.pleaButton = button;
    this.pleaRemaining = 15;
    this.world.classList.add('miracle-request');
  }

  private clearPlea(): void {
    this.pleaButton?.remove();
    this.pleaButton = null;
    this.pleaRemaining = 0;
    this.pleaCooldown = 35 + Math.random() * 30;
    this.world.classList.remove('miracle-request');
  }
}
