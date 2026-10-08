import { GameStateManager } from '../core/GameState.js';
import { events, GameEvents } from '../core/EventBus.js';
import { formatNumber } from '../systems/calculations.js';
import { describeChurchScene, type ChurchSceneDescription, type ChurchSnapshot, type ChurchTier } from '../features/church/churchScene.js';
import { isArtReview } from './artReview.js';
import { paintPixelSphere } from './pixelSphere.js';

type ArtScene = 'tier-0' | 'tier-1' | 'procession';

const TIER_TEXT: Record<ChurchTier, { title: string; status: string; caption: string }> = {
  0: { title: 'A Igreja em Ruínas', status: 'Uma luz fraca entre os escombros', caption: 'Algo ainda brilha onde ninguém reza.' },
  1: { title: 'O Altar Improvisado', status: 'A Esfera repousa no altar', caption: 'Os escombros foram retirados. O culto tem um lugar.' }
};

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

  constructor(private gameState: GameStateManager, onSphereClick: (event: MouseEvent) => void, private grantMiracle: (x: number, y: number) => number) {
    paintPixelSphere(this.sphere.querySelector('canvas')!);
    this.sphere.addEventListener('click', onSphereClick);
    this.world.classList.toggle('scene-paused', document.hidden);
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

  private setArtScene(artScene: ArtScene): void {
    document.querySelectorAll<HTMLButtonElement>('[data-art-scene]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.artScene === artScene));
    });
    const procession = artScene === 'procession';
    this.world.hidden = procession;
    document.getElementById('procession-world')!.hidden = !procession;
    document.querySelectorAll<HTMLElement>('.procession-review-only').forEach(control => { control.hidden = !procession; });
    if (!procession) {
      this.reviewTier = artScene === 'tier-1' ? 1 : 0;
      this.sync();
    }
  }

  private sync(): void {
    const snapshot = churchSnapshot(this.gameState);
    if (this.reviewTier !== null) snapshot.selos.incarnation = this.reviewTier === 1;
    const next = describeChurchScene(snapshot);
    document.getElementById('church-count')!.textContent = `${formatNumber(this.gameState.getTotalFollowersCount())} fiéis`;
    if (this.scene?.tier === next.tier && this.scene.sphereLocation === next.sphereLocation) return;
    this.scene = next;
    this.world.dataset.churchTier = String(next.tier);
    this.sphere.dataset.location = next.sphereLocation;
    this.background.src = `/assets/church/tier-${next.tier}.png`;
    const text = TIER_TEXT[next.tier];
    document.getElementById('church-title')!.textContent = text.title;
    document.getElementById('church-status')!.textContent = text.status;
    document.getElementById('church-caption')!.textContent = text.caption;
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
    document.getElementById('church-stage')!.append(button);
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
