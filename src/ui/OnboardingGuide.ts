import { GameStateManager } from '../core/GameState.js';
import { NotificationManager } from '../systems/notifications.js';
import { NavigationManager } from './NavigationManager.js';
import { AudioManager } from '../systems/audio.js';

export interface OnboardingGuideOptions {
  gameState: GameStateManager;
  notifications: NotificationManager;
  nav?: NavigationManager;
  audio?: AudioManager;
}

export type SpotlightStep = 'sphere' | 'buy_follower' | 'complete';

export class OnboardingGuide {
  private gameState: GameStateManager;
  private notifications: NotificationManager;
  private nav?: NavigationManager;
  private audio?: AudioManager;

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

  constructor(options: OnboardingGuideOptions) {
    this.gameState = options.gameState;
    this.notifications = options.notifications;
    this.nav = options.nav;
    this.audio = options.audio;

    const devotee = this.gameState.followers[0];
    const followerCount = devotee ? devotee.count : 0;
    if (this.gameState.hasSeenIntro && followerCount >= 1) {
      this.isDismissed = true;
    }

    this.initElements();
    this.bindEvents();
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
  }

  private nudgeAttention(): void {
    this.audio?.playTone(260, 'sawtooth', 0.05);
    if (this.balloonEl) {
      this.balloonEl.classList.remove('nudge-bounce');
      void this.balloonEl.offsetWidth; // trigger reflow
      this.balloonEl.classList.add('nudge-bounce');
    }
  }

  public setNavigation(nav: NavigationManager): void {
    this.nav = nav;
  }

  public dismiss(): void {
    this.isDismissed = true;
    this.gameState.hasSeenIntro = true;
    document.getElementById('btn-convert-one')?.classList.remove('pulse-guide');
    this.hideOverlay();
  }

  public restartTour(): void {
    this.isDismissed = false;
    this.hasCelebrated = false;
    this.update();
  }

  private hideOverlay(): void {
    if (!this.overlayEl) return;
    this.overlayEl.style.opacity = '0';
    setTimeout(() => {
      if (this.overlayEl) {
        this.overlayEl.style.display = 'none';
        this.overlayEl.style.opacity = '1';
      }
    }, 300);
  }

  public update(): void {
    if (!this.overlayEl || this.isDismissed) return;

    // Do not show spotlight overlay while start screen is active
    const startScreen = document.getElementById('start-screen');
    if (startScreen && startScreen.classList.contains('active')) {
      this.overlayEl.style.display = 'none';
      return;
    }

    // Do not show spotlight overlay while any full modal is visibly open
    const openModals = document.querySelectorAll('.modal-overlay.open');
    if (openModals.length > 0) {
      this.overlayEl.style.display = 'none';
      return;
    }

    const devotee = this.gameState.followers[0];
    const followerCount = devotee ? devotee.count : 0;
    const faith = Math.floor(this.gameState.faithPoints);
    const targetFaith = devotee ? this.gameState.getItemCost(devotee) : 20;

    // Condition 1: Tour complete (already has 1 or more followers)
    if (followerCount >= 1) {
      if (!this.hasCelebrated && this.gameState.totalClicks > 0) {
        this.hasCelebrated = true;
        this.notifications.showCustomPopup(
          'PRIMEIRO FIEL REUNIDO!',
          'Seu devoto se juntou à procissão e começou a gerar Fé contínua a cada segundo (+1 Fé/s)!',
          '👥',
          'CONGREGAÇÃO'
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
      // Ensure left panel is open on desktop & visible on mobile
      if (this.nav) {
        this.nav.togglePanel('left', true);
        if (window.innerWidth <= 860) {
          this.nav.setMobileView('left');
        }
      }
    }

    // Toggle glowing pulse on the convert button when in step 2
    const convertBtn = document.getElementById('btn-convert-one');
    if (this.currentStep === 'buy_follower') {
      convertBtn?.classList.add('pulse-guide');
    } else {
      convertBtn?.classList.remove('pulse-guide');
    }

    this.renderStepContent(faith, targetFaith);
    this.updatePosition();

    // If step just transitioned to buy_follower, schedule follow-up adjustments as panels slide open
    if (prevStep !== this.currentStep && this.currentStep === 'buy_follower') {
      setTimeout(() => this.updatePosition(), 100);
      setTimeout(() => this.updatePosition(), 250);
      setTimeout(() => this.updatePosition(), 450);
    }
  }

  private renderStepContent(faith: number, targetFaith: number): void {
    if (this.currentStep === 'sphere') {
      const percent = Math.min(100, Math.floor((faith / targetFaith) * 100));

      if (this.iconEl) this.iconEl.textContent = '🔮';
      if (this.badgeEl) this.badgeEl.textContent = 'ETAPA 1/2 • VOCÊ É O DEUS ESFERA';
      if (this.titleEl) this.titleEl.textContent = 'Toque na Esfera Divina';
      if (this.descEl) {
        this.descEl.textContent = 'Você é uma divindade cósmica manifestada na Esfera Sagrada. Cada toque canaliza Fé cósmica pura para alimentar seu despertar divino!';
      }
      if (this.trackerMetaEl) this.trackerMetaEl.textContent = `Meta inicial: ${targetFaith} Fé`;
      if (this.trackerValEl) this.trackerValEl.textContent = `${faith} / ${targetFaith} Fé (${percent}%)`;
      if (this.trackerFillEl) {
        this.trackerFillEl.style.width = `${percent}%`;
        this.trackerFillEl.style.background = 'linear-gradient(90deg, #f59e0b, #fef08a)';
      }
      if (this.actionTipEl) {
        this.actionTipEl.textContent = '👉 Toque repetidamente na Esfera iluminada para acumular Fé (+1 Fé/toque)!';
      }
    } else {
      // Step 2: Buy follower
      if (this.iconEl) this.iconEl.textContent = '🏛️';
      if (this.badgeEl) this.badgeEl.textContent = 'ETAPA 2/2 • PÁTIO DOS FIÉIS: COMPRE FIÉIS';
      if (this.titleEl) this.titleEl.textContent = 'Compre seu 1º Fiel para gerar Fé/s';
      if (this.descEl) {
        this.descEl.textContent = 'Fé suficiente reunida! No Pátio dos Fiéis à esquerda, converta seu 1º Devoto para que suas preces gerem Fé contínua a cada segundo (+1 Fé/s)!';
      }
      if (this.trackerMetaEl) this.trackerMetaEl.textContent = `Custo: ${targetFaith} Fé`;
      if (this.trackerValEl) this.trackerValEl.textContent = 'Pronto para converter!';
      if (this.trackerFillEl) {
        this.trackerFillEl.style.width = '100%';
        this.trackerFillEl.style.background = 'linear-gradient(90deg, #22c55e, #86efac)';
      }
      if (this.actionTipEl) {
        this.actionTipEl.textContent = '👉 Clique no botão iluminado "CONVERTER FIEL" para ativar sua Fé/s automática!';
      }
    }
  }

  private updatePosition(): void {
    if (this.isPositioning) return;
    this.isPositioning = true;

    requestAnimationFrame(() => {
      this.isPositioning = false;
      if (!this.overlayEl) return;

      const targetEl = this.currentStep === 'sphere'
        ? (document.getElementById('divine-sphere-btn') || document.getElementById('divine-sphere-container'))
        : (document.getElementById('btn-convert-one') || document.getElementById('panel-left'));

      if (!targetEl) {
        return;
      }

      const rect = targetEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        requestAnimationFrame(() => this.updatePosition());
        return;
      }

      this.overlayEl.style.display = 'block';
      this.overlayEl.style.opacity = '1';

      const pad = this.currentStep === 'sphere' ? 10 : 6;
      const spotTop = Math.max(0, rect.top - pad);
      const spotLeft = Math.max(0, rect.left - pad);
      const spotWidth = rect.width + pad * 2;
      const spotHeight = rect.height + pad * 2;
      const spotBottom = spotTop + spotHeight;
      const spotRight = spotLeft + spotWidth;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // 1. Position 4 Grayscale Backdrop Panels
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

      // 2. Position Focus Ring
      if (this.focusRing) {
        this.focusRing.style.top = `${spotTop}px`;
        this.focusRing.style.left = `${spotLeft}px`;
        this.focusRing.style.width = `${spotWidth}px`;
        this.focusRing.style.height = `${spotHeight}px`;
        this.focusRing.style.borderRadius = this.currentStep === 'sphere' ? '50%' : '12px';
      }

      // 3. Position Balloon & Arrow
      if (this.balloonEl) {
        const balloonW = Math.min(380, vw - 28);
        this.balloonEl.style.width = `${balloonW}px`;

        const bRect = this.balloonEl.getBoundingClientRect();
        const balloonH = bRect.height || 210;

        let bTop = 0;
        let bLeft = 0;
        let arrowDir: 'arrow-bottom' | 'arrow-top' | 'arrow-left' | 'arrow-right' = 'arrow-bottom';

        const targetCenterX = spotLeft + spotWidth / 2;
        const targetCenterY = spotTop + spotHeight / 2;

        if (this.currentStep === 'sphere') {
          // Centered horizontally above sphere if space allows
          const spaceAbove = spotTop;
          if (spaceAbove >= balloonH + 20) {
            bTop = spotTop - balloonH - 16;
            arrowDir = 'arrow-bottom';
          } else {
            bTop = spotBottom + 16;
            arrowDir = 'arrow-top';
          }
          bLeft = Math.max(14, Math.min(vw - balloonW - 14, targetCenterX - balloonW / 2));
        } else {
          // For convert button: on desktop try placing on right side; otherwise above or below
          const spaceRight = vw - spotRight;
          if (vw > 860 && spaceRight >= balloonW + 24) {
            bLeft = spotRight + 18;
            bTop = Math.max(14, Math.min(vh - balloonH - 14, targetCenterY - balloonH / 2));
            arrowDir = 'arrow-left';
          } else {
            const spaceAbove = spotTop;
            if (spaceAbove >= balloonH + 20) {
              bTop = spotTop - balloonH - 16;
              arrowDir = 'arrow-bottom';
            } else {
              bTop = spotBottom + 16;
              arrowDir = 'arrow-top';
            }
            bLeft = Math.max(14, Math.min(vw - balloonW - 14, targetCenterX - balloonW / 2));
          }
        }

        this.balloonEl.style.top = `${bTop}px`;
        this.balloonEl.style.left = `${bLeft}px`;

        // Update Arrow class and dynamic alignment toward target focal point
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
    });
  }
}
