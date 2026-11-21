import { GameStateManager } from '../core/GameState.js';
import { AudioManager } from '../systems/audio.js';
import { formatNumber } from '../systems/calculations.js';
import { icon } from './icons.js';
import { hudBottom } from './dom.js';
import { CARD_TUTORIALS, cardTutorialKey, type CardTutorial } from '../config/cardTutorials.js';
import { events, GameEvents } from '../core/EventBus.js';
import type { BoardCamera } from './BoardManager.js';

const BOARD_ARRANGE_KEY = 'board-arrange';

export interface OnboardingGuideOptions {
  gameState: GameStateManager;
  audio?: AudioManager;
  onFocusCard?: (cardId: string, immediate?: boolean, targetSelector?: string) => void;
}

export type SpotlightStep = 'sphere' | 'buy_follower' | 'complete';

export class OnboardingGuide {
  private gameState: GameStateManager;
  private audio?: AudioManager;
  private onFocusCard?: (cardId: string, immediate?: boolean, targetSelector?: string) => void;

  // DOM Elements
  private overlayEl: HTMLElement | null = null;
  private panelTop: HTMLElement | null = null;
  private panelBottom: HTMLElement | null = null;
  private panelLeft: HTMLElement | null = null;
  private panelRight: HTMLElement | null = null;
  private focusRing: HTMLElement | null = null;

  // Balloon Elements
  private balloonEl: HTMLElement | null = null;
  private arrowEl: HTMLElement | null = null;
  private iconEl: HTMLElement | null = null;
  private badgeEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private descEl: HTMLElement | null = null;
  private trackerMetaEl: HTMLElement | null = null;
  private trackerValEl: HTMLElement | null = null;
  private trackerFillEl: HTMLElement | null = null;
  private actionTipEl: HTMLElement | null = null;
  private skipBtn: HTMLButtonElement | null = null;

  private currentStep: SpotlightStep = 'sphere';
  // shortcut: kept in memory only, so a reload mid-intro shows the Sphere step again; save it if that matters.
  private sphereStepSkipped: boolean = false;
  private isDismissed: boolean = false;
  private isPositioning: boolean = false;
  private cardTutorial: CardTutorial | null = null;
  private canPresent: boolean = false;

  // The player's camera from before a row of tutorials; 'lost' once a modal, battle or hidden tips cut the row.
  private savedCamera: BoardCamera | 'lost' | null = null;
  private getCamera?: () => BoardCamera;
  private restoreCamera?: (camera: BoardCamera) => void;

  constructor(options: OnboardingGuideOptions) {
    this.gameState = options.gameState;
    this.audio = options.audio;
    this.onFocusCard = options.onFocusCard;

    this.isDismissed = this.gameState.hasSeenIntro;

    this.initElements();
    this.bindEvents();
    // Moving any card proves the player knows how, so the arranging tip is done for good.
    events.on(GameEvents.CARD_ARRANGED, () => {
      this.gameState.seenCardTutorials.add(BOARD_ARRANGE_KEY);
      if (this.cardTutorial && cardTutorialKey(this.cardTutorial) === BOARD_ARRANGE_KEY) {
        this.cardTutorial = null;
        this.hideOverlay();
      }
    });
  }

  public setOnFocusCard(cb: (cardId: string, immediate?: boolean, targetSelector?: string) => void): void {
    this.onFocusCard = cb;
  }

  public setCamera(get: () => BoardCamera, restore: (camera: BoardCamera) => void): void {
    this.getCamera = get;
    this.restoreCamera = restore;
  }

  private focusCard(...args: Parameters<NonNullable<OnboardingGuideOptions['onFocusCard']>>): void {
    if (this.savedCamera === null && this.getCamera) this.savedCamera = this.getCamera();
    this.onFocusCard?.(...args);
  }

  private loseCamera(): void {
    if (this.savedCamera) this.savedCamera = 'lost';
  }

  // Cached static DOM references & layout dirty state
  private startScreenEl: HTMLElement | null = null;
  private convertBtnEl: HTMLElement | null = null;
  private trackerEl: HTMLElement | null = null;
  private hudBarEl: HTMLElement | null = null;
  private quickNavBarEl: HTMLElement | null = null;
  private lastLayoutSig = '';
  private balloonContentDirty = true;

  private initElements(): void {
    this.overlayEl = document.getElementById('spotlight-tour-overlay');
    this.panelTop = document.getElementById('spotlight-panel-top');
    this.panelBottom = document.getElementById('spotlight-panel-bottom');
    this.panelLeft = document.getElementById('spotlight-panel-left');
    this.panelRight = document.getElementById('spotlight-panel-right');
    this.focusRing = document.getElementById('spotlight-focus-ring');

    this.balloonEl = document.getElementById('spotlight-balloon');
    this.arrowEl = document.getElementById('spotlight-balloon-arrow');
    this.iconEl = document.getElementById('spotlight-balloon-icon');
    this.badgeEl = document.getElementById('spotlight-balloon-badge');
    this.titleEl = document.getElementById('spotlight-balloon-title');
    this.descEl = document.getElementById('spotlight-balloon-desc');
    this.trackerMetaEl = document.getElementById('spotlight-tracker-meta');
    this.trackerValEl = document.getElementById('spotlight-tracker-val');
    this.trackerFillEl = document.getElementById('spotlight-tracker-bar-fill');
    this.actionTipEl = document.getElementById('spotlight-balloon-action-tip');
    this.skipBtn = document.getElementById('spotlight-balloon-skip') as HTMLButtonElement | null;

    this.startScreenEl = document.getElementById('start-screen');
    this.convertBtnEl = document.getElementById('btn-convert-one');
    this.trackerEl = document.getElementById('spotlight-balloon-tracker');
    this.hudBarEl = document.querySelector<HTMLElement>('.top-hud-bar');
    this.quickNavBarEl = document.getElementById('board-quicknav-bar');
  }

  private bindEvents(): void {
    this.skipBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      // Skipping the Sphere step only moves on to converting the first Faithful.
      if (!this.cardTutorial && this.currentStep === 'sphere') {
        this.sphereStepSkipped = true;
        this.update();
      } else this.dismiss();
    });

    // When clicking any of the gray backdrop panels, nudge the balloon
    const panels = [this.panelTop, this.panelBottom, this.panelLeft, this.panelRight];
    panels.forEach((p) => {
      p?.addEventListener('click', () => {
        this.nudgeAttention();
      });
    });

    window.addEventListener('resize', () => {
      if (this.overlayEl && this.overlayEl.style.display !== 'none') {
        this.lastLayoutSig = '';
        this.updatePosition();
      }
    });

    window.addEventListener('scroll', () => {
      if (this.overlayEl && this.overlayEl.style.display !== 'none') {
        this.lastLayoutSig = '';
        this.updatePosition();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.cardTutorial && this.overlayEl?.style.display !== 'none') {
        this.dismiss();
      }
    });
  }

  private nudgeAttention(): void {
    this.audio?.playTone(260, 'sawtooth', 0.05);
    if (this.balloonEl) {
      this.balloonEl.classList.remove('nudge-bounce');
      void this.balloonEl.offsetWidth;
      this.balloonEl.classList.add('nudge-bounce');
    }
  }

  public restart(): void {
    this.gameState.hideGuidance = false;
    this.gameState.hasSeenIntro = false;
    this.gameState.seenCardTutorials.clear();
    this.cardTutorial = null;
    this.isDismissed = false;
    this.currentStep = 'sphere';
    this.sphereStepSkipped = false;
    this.savedCamera = null;
    this.lastLayoutSig = '';
    this.update();
  }

  public dismiss(): void {
    if (this.cardTutorial) {
      this.gameState.seenCardTutorials.add(cardTutorialKey(this.cardTutorial));
      this.cardTutorial = null;
      this.hideOverlay();
      return;
    }
    this.isDismissed = true;
    this.gameState.hasSeenIntro = true;
    const convertBtn = this.convertBtnEl ?? (this.convertBtnEl = document.getElementById('btn-convert-one'));
    convertBtn?.classList.remove('pulse-guide');
    this.hideOverlay();
  }

  private hideOverlay(): void {
    if (!this.overlayEl) return;
    // Hide synchronously so an old dismissal cannot hide the next queued tooltip.
    this.setStyleIfChanged(this.overlayEl, 'display', 'none');
    this.lastLayoutSig = '';
  }

  public update(): void {
    this.canPresent = false;
    if (!this.overlayEl) return;
    if (this.gameState.hideGuidance) {
      this.loseCamera();
      this.hideOverlay();
      return;
    }

    // Sync dismissal state if save loaded after construction
    const devotee = this.gameState.followers[0];
    const followerCount = devotee ? devotee.count : 0;
    this.isDismissed = this.gameState.hasSeenIntro;
    if (!this.isDismissed && this.cardTutorial && !('requiresIntro' in this.cardTutorial)) this.cardTutorial = null;

    // This runs on every game tick: with nothing to present, skip searching the page.
    if (this.isDismissed && !this.cardTutorial && !CARD_TUTORIALS.some(tutorial => this.isTutorialAvailable(tutorial))) {
      // The row of tutorials is over: hand the camera back to the player.
      if (this.savedCamera && this.savedCamera !== 'lost') this.restoreCamera?.(this.savedCamera);
      this.savedCamera = null;
      this.hideOverlay();
      return;
    }

    // Do not show spotlight overlay while start screen is active
    const startScreen = this.startScreenEl ?? (this.startScreenEl = document.getElementById('start-screen'));
    if (startScreen && startScreen.classList.contains('active')) {
      this.setStyleIfChanged(this.overlayEl, 'display', 'none');
      this.lastLayoutSig = '';
      return;
    }

    // Do not show spotlight overlay while any full modal is visibly open
    if (this.gameState.activeBossBattle || document.querySelector('.modal-overlay.open, .modal-overlay.active, dialog[open]')) {
      this.loseCamera();
      this.setStyleIfChanged(this.overlayEl, 'display', 'none');
      this.lastLayoutSig = '';
      return;
    }

    this.canPresent = true;
    if (this.isDismissed || CARD_TUTORIALS.some(tutorial => 'requiresIntro' in tutorial && this.isTutorialAvailable(tutorial))) {
      this.updateCardTutorial();
      return;
    }

    const faith = Math.floor(this.gameState.faithPoints);
    const targetFaith = devotee ? this.gameState.getItemCost(devotee) : 20;

    // Condition 1: Tour complete (already has 1 or more followers)
    if (followerCount >= 1) {
      this.dismiss();
      return;
    }

    const prevStep = this.currentStep;

    // Condition 2: Step 1 vs Step 2
    if (faith < targetFaith && !this.sphereStepSkipped) {
      this.currentStep = 'sphere';
    } else {
      this.currentStep = 'buy_follower';
    }

    // Toggle glowing pulse on the convert button when in step 2
    const convertBtn = this.convertBtnEl ?? (this.convertBtnEl = document.getElementById('btn-convert-one'));
    const shouldPulse = this.currentStep === 'buy_follower';
    if (convertBtn && convertBtn.classList.contains('pulse-guide') !== shouldPulse) {
      convertBtn.classList.toggle('pulse-guide', shouldPulse);
    }

    // If step just transitioned to buy_follower, pan the board camera to card-followers!
    if (prevStep !== this.currentStep && this.currentStep === 'buy_follower') {
      this.focusCard('card-followers', true);
      setTimeout(() => { this.lastLayoutSig = ''; this.updatePosition(); }, 60);
      setTimeout(() => { this.lastLayoutSig = ''; this.updatePosition(); }, 200);
    }

    this.renderStepContent(faith, targetFaith);
    this.applyPositionSync();
  }

  private setTextIfChanged(el: HTMLElement | null, value: string): void {
    if (el && el.textContent !== value) {
      el.textContent = value;
      this.balloonContentDirty = true;
    }
  }

  private setIconIfChanged(iconKey: Parameters<typeof icon>[0]): void {
    if (!this.iconEl || this.iconEl.dataset.iconKey === iconKey) return;
    this.iconEl.dataset.iconKey = iconKey;
    this.iconEl.innerHTML = icon(iconKey);
    this.balloonContentDirty = true;
  }

  private setStyleIfChanged(el: HTMLElement | null, prop: 'top' | 'left' | 'width' | 'height' | 'maxHeight' | 'display' | 'opacity' | 'borderRadius' | 'background', value: string): void {
    if (el && el.style[prop] !== value) el.style[prop] = value;
  }

  private renderStepContent(faith: number, targetFaith: number): void {
    this.setTextIfChanged(this.skipBtn, 'Pular');
    const tracker = this.trackerEl ?? (this.trackerEl = document.getElementById('spotlight-balloon-tracker'));
    this.setStyleIfChanged(tracker, 'display', '');
    const percent = Math.min(100, Math.floor((faith / targetFaith) * 100));
    if (this.currentStep === 'sphere') {

      this.setIconIfChanged('orb');
      this.setTextIfChanged(this.badgeEl, 'ETAPA 1/2 • O DESPERTAR');
      this.setTextIfChanged(this.titleEl, 'Clique na Esfera');
      this.setTextIfChanged(this.descEl, 'Você é a Esfera, selada há eras. Cada clique seu arranca Fé das mentes mortais.');
      this.setTextIfChanged(this.trackerMetaEl, `Meta inicial: ${formatNumber(targetFaith)} Fé`);
      this.setTextIfChanged(this.trackerValEl, `${formatNumber(faith)} / ${formatNumber(targetFaith)} Fé (${percent}%)`);
      this.setStyleIfChanged(this.trackerFillEl, 'width', `${percent}%`);
      this.setStyleIfChanged(this.trackerFillEl, 'background', 'linear-gradient(90deg, #f59e0b, #fef08a)');
      this.setTextIfChanged(this.actionTipEl, 'Clique na Esfera até juntar Fé suficiente.');
    } else {
      // Step 2: Buy follower
      this.setIconIfChanged('temple');
      this.setTextIfChanged(this.badgeEl, 'ETAPA 2/2 • CONVERTA FIÉIS');
      this.setTextIfChanged(this.titleEl, 'Converta seu primeiro fiel');
      this.setTextIfChanged(this.descEl, 'Um mortal ouviu o chamado da Esfera. Converta-o para o Pátio dos Fiéis para gerar Fé. Atenda aos pedidos dos fiéis oferecendo Milagres para ganhar Fé extra.');
      this.setTextIfChanged(this.trackerMetaEl, `Custo: ${formatNumber(targetFaith)} Fé`);
      // After skipping the Sphere step the Faith may still fall short, so show what is missing.
      const ready = faith >= targetFaith;
      this.setTextIfChanged(this.trackerValEl, ready ? 'Pronto para converter!' : `${formatNumber(faith)} / ${formatNumber(targetFaith)} Fé (${percent}%)`);
      this.setStyleIfChanged(this.trackerFillEl, 'width', `${ready ? 100 : percent}%`);
      this.setStyleIfChanged(this.trackerFillEl, 'background', ready ? 'linear-gradient(90deg, #22c55e, #86efac)' : 'linear-gradient(90deg, #f59e0b, #fef08a)');
      this.setTextIfChanged(this.actionTipEl, 'Clique em “CONVERTER FIEL” para iniciar a produção de Fé.');
    }
  }

  private isTutorialAvailable(tutorial: CardTutorial): boolean {
    if (this.gameState.seenCardTutorials.has(cardTutorialKey(tutorial))) return false;
    if ('requiresIntro' in tutorial) return !this.gameState.hasSeenIntro;
    if ('afterIntro' in tutorial) return this.gameState.hasSeenIntro;
    if ('requiresBoss' in tutorial && !this.gameState.canChallengeBoss(tutorial.requiresBoss)) return false;
    if ('unlockId' in tutorial) {
      return this.gameState.unlocks.some(u => u.id === tutorial.unlockId && u.unlocked);
    }
    return this.gameState.unlocks.some(u => !u.unlocked);
  }

  private updateCardTutorial(): void {
    if (this.cardTutorial && !this.isTutorialAvailable(this.cardTutorial)) this.cardTutorial = null;
    const tutorial = this.cardTutorial ?? CARD_TUTORIALS.find(candidate => this.isTutorialAvailable(candidate));
    if (!tutorial) {
      this.hideOverlay();
      return;
    }
    const card = document.getElementById(tutorial.cardId);
    // Wait for the board to expose the card, even if its unlock and render share a tick.
    if (!card || card.offsetWidth === 0 || card.style.display === 'none') {
      this.hideOverlay();
      return;
    }
    const entering = this.cardTutorial !== tutorial;
    this.cardTutorial = tutorial;
    if (entering) {
      this.lastLayoutSig = '';
      if ('targetSelector' in tutorial) this.focusCard(tutorial.cardId, true, tutorial.targetSelector);
      else this.focusCard(tutorial.cardId, true);
    }
    this.setIconIfChanged(tutorial.icon);
    this.setTextIfChanged(this.badgeEl, 'CONHEÇA A MECÂNICA');
    this.setTextIfChanged(this.titleEl, tutorial.title);
    this.setTextIfChanged(this.descEl, tutorial.lore);
    this.setTextIfChanged(this.actionTipEl, tutorial.basics);
    this.setTextIfChanged(this.skipBtn, 'Entendi');
    const tracker = this.trackerEl ?? (this.trackerEl = document.getElementById('spotlight-balloon-tracker'));
    this.setStyleIfChanged(tracker, 'display', 'none');
    this.applyPositionSync();
    if (entering) {
      this.lastLayoutSig = '';
      this.updatePosition();
      this.skipBtn?.focus({ preventScroll: true });
    }
  }

  private applyPositionSync(): void {
    if (!this.canPresent || !this.overlayEl || (this.isDismissed && !this.cardTutorial)) return;

    // The Sphere's header is intentionally hidden; anchor its tutorial to the Sphere itself.
    const tutorialHeader = this.cardTutorial && this.cardTutorial.cardId !== 'card-altar-sphere'
      ? document.getElementById(this.cardTutorial.cardId)?.querySelector<HTMLElement>('.dodeca-card-header') : null;
    const tutorialTarget = this.cardTutorial && 'targetSelector' in this.cardTutorial
      ? document.getElementById(this.cardTutorial.cardId)?.querySelector<HTMLElement>(this.cardTutorial.targetSelector) : null;
    const targetEl = tutorialTarget ?? tutorialHeader ?? (this.currentStep === 'sphere'
      ? (document.getElementById('divine-sphere-btn') || document.getElementById('divine-sphere-container'))
      : ((this.convertBtnEl ?? (this.convertBtnEl = document.getElementById('btn-convert-one'))) || document.getElementById('card-followers')));

    if (!targetEl) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let rect = targetEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    if (
      rect.right < 24 ||
      rect.left > vw - 24 ||
      rect.bottom < 60 ||
      rect.top > vh - 60
    ) {
      const targetCardId = this.cardTutorial?.cardId ?? (this.currentStep === 'sphere' ? 'card-altar-sphere' : 'card-followers');
      if (this.cardTutorial && 'targetSelector' in this.cardTutorial) {
        this.focusCard(targetCardId, true, this.cardTutorial.targetSelector);
      } else this.focusCard(targetCardId, true);
      rect = targetEl.getBoundingClientRect();
    }

    const pad = this.currentStep === 'sphere' ? 10 : 6;
    const spotTop = Math.max(0, Math.round(rect.top - pad));
    const spotLeft = Math.max(0, Math.round(rect.left - pad));
    const spotWidth = Math.round(Math.min(vw - spotLeft, rect.width + pad * 2));
    const spotHeight = Math.round(Math.min(vh - spotTop, rect.height + pad * 2));
    const layoutSig = `${vw}:${vh}:${spotTop}:${spotLeft}:${spotWidth}:${spotHeight}:${this.cardTutorial ? cardTutorialKey(this.cardTutorial) : this.currentStep}`;

    if (!this.balloonContentDirty && layoutSig === this.lastLayoutSig && this.overlayEl.style.display === 'block') {
      return;
    }
    this.balloonContentDirty = false;
    this.lastLayoutSig = layoutSig;

    this.setStyleIfChanged(this.overlayEl, 'display', 'block');
    this.setStyleIfChanged(this.overlayEl, 'opacity', '1');

    const spotBottom = spotTop + spotHeight;
    const spotRight = spotLeft + spotWidth;

    if (this.panelTop) {
      this.setStyleIfChanged(this.panelTop, 'top', '0px');
      this.setStyleIfChanged(this.panelTop, 'left', '0px');
      this.setStyleIfChanged(this.panelTop, 'width', '100vw');
      this.setStyleIfChanged(this.panelTop, 'height', `${spotTop}px`);
    }
    if (this.panelBottom) {
      this.setStyleIfChanged(this.panelBottom, 'top', `${spotBottom}px`);
      this.setStyleIfChanged(this.panelBottom, 'left', '0px');
      this.setStyleIfChanged(this.panelBottom, 'width', '100vw');
      this.setStyleIfChanged(this.panelBottom, 'height', `${Math.max(0, vh - spotBottom)}px`);
    }
    if (this.panelLeft) {
      this.setStyleIfChanged(this.panelLeft, 'top', `${spotTop}px`);
      this.setStyleIfChanged(this.panelLeft, 'left', '0px');
      this.setStyleIfChanged(this.panelLeft, 'width', `${spotLeft}px`);
      this.setStyleIfChanged(this.panelLeft, 'height', `${spotHeight}px`);
    }
    if (this.panelRight) {
      this.setStyleIfChanged(this.panelRight, 'top', `${spotTop}px`);
      this.setStyleIfChanged(this.panelRight, 'left', `${spotRight}px`);
      this.setStyleIfChanged(this.panelRight, 'width', `${Math.max(0, vw - spotRight)}px`);
      this.setStyleIfChanged(this.panelRight, 'height', `${spotHeight}px`);
    }

    if (this.focusRing) {
      this.setStyleIfChanged(this.focusRing, 'top', `${spotTop}px`);
      this.setStyleIfChanged(this.focusRing, 'left', `${spotLeft}px`);
      this.setStyleIfChanged(this.focusRing, 'width', `${spotWidth}px`);
      this.setStyleIfChanged(this.focusRing, 'height', `${spotHeight}px`);
      this.setStyleIfChanged(this.focusRing, 'borderRadius', !this.cardTutorial && this.currentStep === 'sphere' ? '50%' : '2px');
    }

    if (this.balloonEl) {
      const balloonW = Math.min(356, Math.max(220, vw - 16));
      this.setStyleIfChanged(this.balloonEl, 'width', `${balloonW}px`);

      const hudBar = this.hudBarEl ?? (this.hudBarEl = document.querySelector<HTMLElement>('.top-hud-bar'));
      const hud = hudBottom(hudBar);
      const topSafe = hud > 0 ? Math.round(hud + 6) : 52;
      const navBar = this.quickNavBarEl ?? (this.quickNavBarEl = document.getElementById('board-quicknav-bar'));
      const zoomControls = document.querySelector<HTMLElement>('.board-zoom-controls');
      let bottomLimit = vh - 56;
      let foundBottomChrome = false;
      for (const el of [navBar, zoomControls]) {
        if (!el) continue;
        const elRect = el.getBoundingClientRect();
        if (elRect.height <= 0 || elRect.width <= 0) continue;
        if (typeof window.getComputedStyle === 'function') {
          const cs = window.getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
        }
        const candidate = Math.round(elRect.top - 8);
        if (!foundBottomChrome || candidate < bottomLimit) {
          bottomLimit = candidate;
          foundBottomChrome = true;
        }
      }

      const maxBalloonH = Math.max(120, bottomLimit - topSafe);
      this.setStyleIfChanged(this.balloonEl, 'maxHeight', `${maxBalloonH}px`);

      const bRect = this.balloonEl.getBoundingClientRect();
      const balloonH = Math.min(bRect.height || 185, maxBalloonH);

      let bTop = 0;
      let bLeft = 0;
      let arrowDir: 'arrow-bottom' | 'arrow-top' | 'arrow-left' | 'arrow-right' = 'arrow-bottom';

      const targetCenterX = spotLeft + spotWidth / 2;
      const targetCenterY = spotTop + spotHeight / 2;

      const spaceAbove = spotTop - topSafe;
      const spaceBelow = bottomLimit - spotBottom;
      const spaceRight = vw - spotRight;

      if ((this.cardTutorial || this.currentStep !== 'sphere') && vw > 860 && spaceRight >= balloonW + 24) {
        bLeft = spotRight + 16;
        bTop = Math.max(topSafe, Math.min(bottomLimit - balloonH, targetCenterY - balloonH / 2));
        arrowDir = 'arrow-left';
      } else if (spaceAbove >= balloonH + 12 && spaceAbove >= spaceBelow) {
        bTop = spotTop - balloonH - 10;
        arrowDir = 'arrow-bottom';
        bLeft = Math.max(8, Math.min(vw - balloonW - 8, targetCenterX - balloonW / 2));
      } else if (spaceBelow >= balloonH + 12) {
        bTop = spotBottom + 10;
        arrowDir = 'arrow-top';
        bLeft = Math.max(8, Math.min(vw - balloonW - 8, targetCenterX - balloonW / 2));
      } else if (spaceAbove >= spaceBelow) {
        bTop = Math.max(topSafe, spotTop - balloonH - 8);
        arrowDir = 'arrow-bottom';
        bLeft = Math.max(8, Math.min(vw - balloonW - 8, targetCenterX - balloonW / 2));
      } else {
        bTop = Math.min(bottomLimit - balloonH, spotBottom + 8);
        arrowDir = 'arrow-top';
        bLeft = Math.max(8, Math.min(vw - balloonW - 8, targetCenterX - balloonW / 2));
      }

      const minTop = Math.min(topSafe, Math.max(8, vh - balloonH - 8));
      const maxTop = Math.max(minTop, Math.min(bottomLimit - balloonH, vh - balloonH - 8));
      bTop = Math.max(minTop, Math.min(maxTop, Math.round(bTop)));
      bLeft = Math.round(bLeft);

      this.setStyleIfChanged(this.balloonEl, 'top', `${bTop}px`);
      this.setStyleIfChanged(this.balloonEl, 'left', `${bLeft}px`);

      if (this.arrowEl) {
        const nextArrowClass = `spotlight-balloon-arrow ${arrowDir}`;
        if (this.arrowEl.className !== nextArrowClass) this.arrowEl.className = nextArrowClass;
        if (arrowDir === 'arrow-bottom' || arrowDir === 'arrow-top') {
          const relX = Math.round(Math.max(20, Math.min(balloonW - 20, targetCenterX - bLeft)));
          this.setStyleIfChanged(this.arrowEl, 'left', `${relX}px`);
          this.setStyleIfChanged(this.arrowEl, 'top', '');
        } else {
          const relY = Math.round(Math.max(20, Math.min(balloonH - 20, targetCenterY - bTop)));
          this.setStyleIfChanged(this.arrowEl, 'top', `${relY}px`);
          this.setStyleIfChanged(this.arrowEl, 'left', '');
        }
      }
    }
  }

  private updatePosition(): void {
    if (this.isPositioning) return;
    this.isPositioning = true;

    requestAnimationFrame(() => {
      this.isPositioning = false;
      this.applyPositionSync();
    });
  }
}
