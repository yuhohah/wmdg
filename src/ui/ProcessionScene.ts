import { GameStateManager } from '../core/GameState.js';
import { events, GameEvents } from '../core/EventBus.js';
import { formatNumber } from '../systems/calculations.js';

export const isArtReview = new URLSearchParams(window.location.search).has('art-review');
type ArtEra = 'early' | 'late';

/** Presentation only: Ascension is an art-review state until its game system exists. */
export class ProcessionScene {
  private era: ArtEra = 'early';
  private count = -1;
  private pulseTimer: number | undefined;
  private miracleTimer: number | undefined;
  private pleaCooldown = 5;
  private pleaRemaining = 0;
  private pleaButton: HTMLButtonElement | null = null;
  private world = document.getElementById('procession-world')!;
  private entourage = document.getElementById('procession-entourage')!;

  constructor(private gameState: GameStateManager, private grantMiracle: (x: number, y: number) => number) {
    if (isArtReview) {
      document.body.classList.add('art-review');
      document.getElementById('art-review-controls')!.hidden = false;
      document.querySelectorAll<HTMLButtonElement>('[data-art-era]').forEach(button => {
        button.addEventListener('click', () => this.setEra(button.dataset.artEra as ArtEra));
      });
      document.getElementById('preview-miracle')!.addEventListener('click', () => this.miracle());
    }
    events.on(GameEvents.STATE_CHANGED, () => this.syncFollowers());
    events.on(GameEvents.FAITH_CHANGED, () => this.pulse());
    events.on(GameEvents.MIRACLE_GRANTED, () => this.miracle());
    events.on(GameEvents.MIRACLE_PLEA, () => this.offerMiracle());
    events.on<number>(GameEvents.GAME_TICK, delta => {
      if (isArtReview || document.hidden || !document.getElementById('gameplay-screen')!.classList.contains('active')) return;
      if (this.pleaRemaining > 0) {
        this.pleaRemaining -= delta;
        if (this.pleaRemaining <= 0) this.clearPlea();
      } else if (this.count > 0) {
        this.pleaCooldown -= delta;
        if (this.pleaCooldown <= 0) this.offerMiracle();
      }
    });
    document.addEventListener('visibilitychange', () => {
      this.world.classList.toggle('scene-paused', document.hidden);
    });
    this.setEra(isArtReview && new URLSearchParams(location.search).get('art-review') === 'late' ? 'late' : 'early');
  }

  private setEra(era: ArtEra): void {
    this.era = era;
    document.body.dataset.artEra = era;
    document.querySelectorAll<HTMLButtonElement>('[data-art-era]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.artEra === era));
    });
    const late = era === 'late';
    document.getElementById('world-era')!.textContent = late ? 'ERA III · A REVELAÇÃO' : 'ERA I · O CHAMADO';
    document.getElementById('world-title')!.textContent = late ? 'Abadia da Revelação' : 'Estrada dos Peregrinos';
    document.getElementById('world-status')!.textContent = late ? 'O ritual começou' : 'A procissão avança';
    document.getElementById('world-caption')!.textContent = late ? 'Todos conhecem as palavras. Ninguém as ensinou.' : 'O caminho começa com uma promessa.';
    document.querySelector<HTMLImageElement>('.ascended-monastery')!.hidden = !late;
    this.paintSpheres(late);
    this.count = -1;
    this.syncFollowers();
  }

  private syncFollowers(): void {
    const total = this.gameState.getTotalFollowersCount();
    const displayed = isArtReview ? (this.era === 'late' ? 12 : 7) : Math.min(12, total);
    document.getElementById('entourage-count')!.textContent = isArtReview
      ? `${displayed} representantes · estudo de ${this.era === 'late' ? 'Ascensão' : 'devoção'}`
      : `${formatNumber(total)} fiéis · uma só promessa`;
    if (displayed === this.count) return;
    const previous = this.count;
    this.count = displayed;
    // Retain existing members so new recruits enter from behind without replaying the whole group.
    while (this.entourage.childElementCount > displayed) this.entourage.lastElementChild?.remove();
    for (let i = this.entourage.childElementCount; i < displayed; i++) {
      const member = document.createElement('div');
      member.className = 'procession-member';
      if (previous >= 0 && !isArtReview) member.classList.add('new-recruit');
      const sprite = document.createElement('img');
      sprite.src = `/assets/procession/follower-${i % 9}.png`;
      sprite.alt = '';
      sprite.style.animationDelay = `${(i % 4) * -0.2}s`;
      member.append(sprite);
      this.entourage.append(member);
    }
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
    if (this.pleaButton || this.count < 1) return;
    const member = this.entourage.children[Math.floor(Math.random() * this.count)];
    const button = document.createElement('button');
    button.className = 'miracle-plea';
    button.type = 'button';
    button.textContent = '✦ ATENDER PRECE';
    button.setAttribute('aria-label', 'Atender prece do fiel e conceder um milagre');
    button.addEventListener('click', event => {
      this.clearPlea();
      this.grantMiracle(event.clientX, event.clientY);
    });
    member.append(button);
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

  private paintSpheres(late: boolean): void {
    document.querySelectorAll<HTMLCanvasElement>('.sphere-pixel-art').forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, 64, 64);
      const colors = late
        ? ['#251b3e', '#483060', '#76548b', '#b79bcc', '#f5dfaa']
        : ['#4b302b', '#896040', '#c49850', '#e9c878', '#fff0b3'];
      // One shared 32px logical grid for the world object and its magnified sacred window.
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
    });
  }
}
