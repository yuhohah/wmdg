import { GameStateManager } from '../core/GameState.js';
import { NotificationManager } from '../systems/notifications.js';
import { AudioManager } from '../systems/audio.js';
import { icon } from './icons.js';
import { CARD_TUTORIALS, type CardTutorial } from '../config/cardTutorials.js';

export interface OnboardingGuideOptions {
  gameState: GameStateManager;
  notifications: NotificationManager;
  audio?: AudioManager;
  onFocusCard?: (cardId: string, immediate?: boolean) => void;
}

export type SpotlightStep = 'sphere' | 'buy_follower' | 'complete';

export class OnboardingGuide {
  private gameState: GameStateManager;
  private notifications: NotificationManager;
  private audio?: AudioManager;
  private onFocusCard?: (cardId: string, immediate?: boolean) => void;

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
  private isDismissed: boolean = false;
  private hasCelebrated: boolean = false;
  private isPositioning: boolean = false;
  private cardTutorial: CardTutorial | null = null;
  private canPresent: boolean = false;

  constructor(options: OnboardingGuideOptions) {
    this.gameState = options.gameState;
    this.notifications = options.notifications;
    this.audio = options.audio;
    this.onFocusCard = options.onFocusCard;

    this.isDismissed = this.gameState.hasSeenIntro;

    this.initElements();
    this.bindEvents();
  }

  public setOnFocusCard(cb: (cardId: string, immediate?: boolean) => void): void {
    this.onFocusCard = cb;
  }

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
  }

  private bindEvents(): void {
    this.skipBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismiss();
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
        this.updatePosition();
      }
    });

    window.addEventListener('scroll', () => {
      if (this.overlayEl && this.overlayEl.style.display !== 'none') {
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

  public dismiss(): void {
    if (this.cardTutorial) {
      this.gameState.seenCardTutorials.add(this.cardTutorial.cardId);
      this.cardTutorial = null;
      this.hideOverlay();
      return;
    }
    this.isDismissed = true;
    this.gameState.hasSeenIntro = true;
    document.getElementById('btn-convert-one')?.classList.remove('pulse-guide');
    this.hideOverlay();
  }

  private hideOverlay(): void {
    if (!this.overlayEl) return;
    // Hide synchronously so an old dismissal cannot hide the next queued tooltip.
    this.overlayEl.style.display = 'none';
  }

  public update(): void {
    this.canPresent = false;
    if (!this.overlayEl) return;

    // Sync dismissal state if save loaded after construction
    const devotee = this.gameState.followers[0];
    const followerCount = devotee ? devotee.count : 0;
    this.isDismissed = this.gameState.hasSeenIntro;
    if (!this.isDismissed) this.cardTutorial = null;

    // Do not show spotlight overlay while start screen is active
    const startScreen = document.getElementById('start-screen');
    if (startScreen && startScreen.classList.contains('active')) {
      this.overlayEl.style.display = 'none';
      return;
    }

    // Do not show spotlight overlay while any full modal is visibly open
    const openModals = document.querySelectorAll('.modal-overlay.open, .modal-overlay.active, dialog[open]');
    if (openModals.length > 0 || this.gameState.activeBossBattle) {
      this.overlayEl.style.display = 'none';
      return;
    }

    this.canPresent = true;
    if (this.isDismissed) {
      this.updateCardTutorial();
      return;
    }

    const faith = Math.floor(this.gameState.faithPoints);
    const targetFaith = devotee ? this.gameState.getItemCost(devotee) : 20;

    // Condition 1: Tour complete (already has 1 or more followers)
    if (followerCount >= 1) {
      if (!this.hasCelebrated && this.gameState.totalClicks > 0) {
        this.hasCelebrated = true;
        this.notifications.showCustomPopup(
          'O PRIMEIRO CONVERSO',
          'Seu primeiro fiel começou a orar no pátio: +1 Fé/s.',
          'followers',
          'FIÉIS'
        );
      }
      this.dismiss();
      return;
    }

    const prevStep = this.currentStep;

    // Condition 2: Step 1 vs Step 2
    if (faith < targetFaith) {
      this.currentStep = 'sphere';
    } else {
      this.currentStep = 'buy_follower';
    }

    // Toggle glowing pulse on the convert button when in step 2
    const convertBtn = document.getElementById('btn-convert-one');
    if (this.currentStep === 'buy_follower') {
      convertBtn?.classList.add('pulse-guide');
    } else {
      convertBtn?.classList.remove('pulse-guide');
    }

    // If step just transitioned to buy_follower, pan the board camera to card-followers!
    if (prevStep !== this.currentStep && this.currentStep === 'buy_follower') {
      this.onFocusCard?.('card-followers', true);
      setTimeout(() => this.updatePosition(), 60);
      setTimeout(() => this.updatePosition(), 200);
    }

    this.renderStepContent(faith, targetFaith);
    this.applyPositionSync();
    this.updatePosition();
  }

  private renderStepContent(faith: number, targetFaith: number): void {
    if (this.skipBtn) this.skipBtn.textContent = 'Pular';
    const tracker = document.getElementById('spotlight-balloon-tracker');
    if (tracker) tracker.style.display = '';
    if (this.currentStep === 'sphere') {
      const percent = Math.min(100, Math.floor((faith / targetFaith) * 100));

      if (this.iconEl) this.iconEl.innerHTML = icon('orb');
      if (this.badgeEl) this.badgeEl.textContent = 'ETAPA 1/2 • O DESPERTAR';
      if (this.titleEl) this.titleEl.textContent = 'Toque a Esfera';
      if (this.descEl) {
        this.descEl.textContent = 'Você é a Esfera, selada há eras. Cada toque seu arranca Fé das mentes mortais.';
      }
      if (this.trackerMetaEl) this.trackerMetaEl.textContent = `Meta inicial: ${targetFaith} Fé`;
      if (this.trackerValEl) this.trackerValEl.textContent = `${faith} / ${targetFaith} Fé (${percent}%)`;
      if (this.trackerFillEl) {
        this.trackerFillEl.style.width = `${percent}%`;
        this.trackerFillEl.style.background = 'linear-gradient(90deg, #f59e0b, #fef08a)';
      }
      if (this.actionTipEl) {
        this.actionTipEl.textContent = 'Toque a Esfera até juntar Fé suficiente (+1 Fé por toque).';
      }
    } else {
      // Step 2: Buy follower
      if (this.iconEl) this.iconEl.innerHTML = icon('temple');
      if (this.badgeEl) this.badgeEl.textContent = 'ETAPA 2/2 • CONVERTA FIÉIS';
      if (this.titleEl) this.titleEl.textContent = 'Converta seu primeiro fiel';
      if (this.descEl) {
        this.descEl.textContent = 'Um primeiro mortal ouviu o chamado da Esfera. No Pátio dos Fiéis, converta-o: ele vai orar por você e gerar +1 Fé/s.';
      }
      if (this.trackerMetaEl) this.trackerMetaEl.textContent = `Custo: ${targetFaith} Fé`;
      if (this.trackerValEl) this.trackerValEl.textContent = 'Pronto para converter!';
      if (this.trackerFillEl) {
        this.trackerFillEl.style.width = '100%';
        this.trackerFillEl.style.background = 'linear-gradient(90deg, #22c55e, #86efac)';
      }
      if (this.actionTipEl) {
        this.actionTipEl.textContent = 'Clique no botão "CONVERTER FIEL".';
      }
    }
  }

  private updateCardTutorial(): void {
    const isAvailable = (tutorial: CardTutorial) => {
      if (this.gameState.seenCardTutorials.has(tutorial.cardId)) return false;
      if ('unlockId' in tutorial) {
        return this.gameState.unlocks.some(u => u.id === tutorial.unlockId && u.unlocked);
      }
      return this.gameState.unlocks.some(u => !u.unlocked);
    };
    if (this.cardTutorial && !isAvailable(this.cardTutorial)) this.cardTutorial = null;
    const tutorial = this.cardTutorial ?? CARD_TUTORIALS.find(isAvailable);
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
    if (entering) this.onFocusCard?.(tutorial.cardId, true);
    if (this.iconEl) this.iconEl.innerHTML = icon(tutorial.icon);
    if (this.badgeEl) this.badgeEl.textContent = 'CONHEÇA ESTE CARD';
    if (this.titleEl) this.titleEl.textContent = tutorial.title;
    if (this.descEl) this.descEl.textContent = tutorial.lore;
    if (this.actionTipEl) this.actionTipEl.textContent = tutorial.basics;
    if (this.skipBtn) this.skipBtn.textContent = 'Entendi';
    const tracker = document.getElementById('spotlight-balloon-tracker');
    if (tracker) tracker.style.display = 'none';
    this.applyPositionSync();
    this.updatePosition();
    if (entering) this.skipBtn?.focus({ preventScroll: true });
  }

  private applyPositionSync(): void {
    if (!this.canPresent || !this.overlayEl || (this.isDismissed && !this.cardTutorial)) return;

    const tutorialHeader = this.cardTutorial
      ? document.getElementById(this.cardTutorial.cardId)?.querySelector<HTMLElement>('.dodeca-card-header') : null;
    const targetEl = tutorialHeader ?? (this.currentStep === 'sphere'
      ? (document.getElementById('divine-sphere-btn') || document.getElementById('divine-sphere-container'))
      : (document.getElementById('btn-convert-one') || document.getElementById('card-followers')));

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
      this.onFocusCard?.(targetCardId, true);
      rect = targetEl.getBoundingClientRect();
    }

    this.overlayEl.style.display = 'block';
    this.overlayEl.style.opacity = '1';

    const pad = this.currentStep === 'sphere' ? 10 : 6;
    const spotTop = Math.max(0, rect.top - pad);
    const spotLeft = Math.max(0, rect.left - pad);
    const spotWidth = Math.min(vw - spotLeft, rect.width + pad * 2);
    const spotHeight = Math.min(vh - spotTop, rect.height + pad * 2);
    const spotBottom = spotTop + spotHeight;
    const spotRight = spotLeft + spotWidth;

    if (this.panelTop) {
      this.panelTop.style.top = '0px';
      this.panelTop.style.left = '0px';
      this.panelTop.style.width = '100vw';
      this.panelTop.style.height = `${spotTop}px`;
    }
    if (this.panelBottom) {
      this.panelBottom.style.top = `${spotBottom}px`;
      this.panelBottom.style.left = '0px';
      this.panelBottom.style.width = '100vw';
      this.panelBottom.style.height = `${Math.max(0, vh - spotBottom)}px`;
    }
    if (this.panelLeft) {
      this.panelLeft.style.top = `${spotTop}px`;
      this.panelLeft.style.left = '0px';
      this.panelLeft.style.width = `${spotLeft}px`;
      this.panelLeft.style.height = `${spotHeight}px`;
    }
    if (this.panelRight) {
      this.panelRight.style.top = `${spotTop}px`;
      this.panelRight.style.left = `${spotRight}px`;
      this.panelRight.style.width = `${Math.max(0, vw - spotRight)}px`;
      this.panelRight.style.height = `${spotHeight}px`;
    }

    if (this.focusRing) {
      this.focusRing.style.top = `${spotTop}px`;
      this.focusRing.style.left = `${spotLeft}px`;
      this.focusRing.style.width = `${spotWidth}px`;
      this.focusRing.style.height = `${spotHeight}px`;
      this.focusRing.style.borderRadius = !this.cardTutorial && this.currentStep === 'sphere' ? '50%' : '2px';
    }

    if (this.balloonEl) {
      const balloonW = Math.min(356, vw - 20);
      this.balloonEl.style.width = `${balloonW}px`;

      const bRect = this.balloonEl.getBoundingClientRect();
      const balloonH = bRect.height || 185;

      const hudRect = document.querySelector('.top-hud-bar')?.getBoundingClientRect();
      const topSafe = hudRect && hudRect.height > 0 ? Math.round(hudRect.bottom + 6) : 52;
      const navRect = document.getElementById('board-quicknav-bar')?.getBoundingClientRect();
      const bottomLimit = navRect && navRect.height > 0 ? Math.round(navRect.top - 8) : vh - 56;

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
        bLeft = Math.max(10, Math.min(vw - balloonW - 10, targetCenterX - balloonW / 2));
      } else if (spaceBelow >= balloonH + 12) {
        bTop = spotBottom + 10;
        arrowDir = 'arrow-top';
        bLeft = Math.max(10, Math.min(vw - balloonW - 10, targetCenterX - balloonW / 2));
      } else if (spaceAbove >= spaceBelow) {
        bTop = Math.max(topSafe, spotTop - balloonH - 8);
        arrowDir = 'arrow-bottom';
        bLeft = Math.max(10, Math.min(vw - balloonW - 10, targetCenterX - balloonW / 2));
      } else {
        bTop = Math.min(bottomLimit - balloonH, spotBottom + 8);
        arrowDir = 'arrow-top';
        bLeft = Math.max(10, Math.min(vw - balloonW - 10, targetCenterX - balloonW / 2));
      }

      bTop = Math.max(8, Math.min(vh - balloonH - 8, bTop));

      this.balloonEl.style.top = `${bTop}px`;
      this.balloonEl.style.left = `${bLeft}px`;

      if (this.arrowEl) {
        this.arrowEl.className = `spotlight-balloon-arrow ${arrowDir}`;
        if (arrowDir === 'arrow-bottom' || arrowDir === 'arrow-top') {
          const relX = Math.max(20, Math.min(balloonW - 20, targetCenterX - bLeft));
          this.arrowEl.style.left = `${relX}px`;
          this.arrowEl.style.top = '';
        } else {
          const relY = Math.max(20, Math.min(balloonH - 20, targetCenterY - bTop));
          this.arrowEl.style.top = `${relY}px`;
          this.arrowEl.style.left = '';
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
