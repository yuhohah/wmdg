import { AudioManager } from '../systems/audio.js';
import { events, GameEvents } from '../core/EventBus.js';

export interface NavigationManagerOptions {
  audio: AudioManager;
  triggerHaptic: (pattern: number | number[]) => void;
  onTabSwitched?: (panel: 'left' | 'right', targetTabId: string) => void;
  onScreenSwitched?: (screen: 'start' | 'gameplay') => void;
}

export class NavigationManager {
  private audio: AudioManager;
  private triggerHaptic: (pattern: number | number[]) => void;
  private onTabSwitched?: (panel: 'left' | 'right', targetTabId: string) => void;
  private onScreenSwitched?: (screen: 'start' | 'gameplay') => void;

  private startScreen: HTMLElement | null = null;
  private gameplayScreen: HTMLElement | null = null;
  private panelLeft: HTMLElement | null = null;
  private panelRight: HTMLElement | null = null;
  private toggleLeftBtn: HTMLButtonElement | null = null;
  private toggleRightBtn: HTMLButtonElement | null = null;
  private expandLeftBtn: HTMLButtonElement | null = null;
  private expandRightBtn: HTMLButtonElement | null = null;

  private gameplayContainer: HTMLElement | null = null;
  private btnNavDevotees: HTMLButtonElement | null = null;
  private btnNavUnlocks: HTMLButtonElement | null = null;
  private badgeNavDevotees: HTMLElement | null = null;
  private badgeNavUnlocks: HTMLElement | null = null;
  private playBtn: HTMLButtonElement | null = null;

  private currentMobileView: 'sphere' | 'left' | 'right' = 'sphere';

  constructor(options: NavigationManagerOptions) {
    this.audio = options.audio;
    this.triggerHaptic = options.triggerHaptic;
    this.onTabSwitched = options.onTabSwitched;
    this.onScreenSwitched = options.onScreenSwitched;

    this.initElements();
    this.bindEvents();

    if (window.innerWidth <= 860) {
      this.setMobileView('sphere');
    }
  }

  private initElements(): void {
    this.startScreen = document.getElementById('start-screen');
    this.gameplayScreen = document.getElementById('gameplay-screen');

    this.panelLeft = document.getElementById('panel-left');
    this.panelRight = document.getElementById('panel-right');
    this.toggleLeftBtn = document.getElementById('toggle-left-btn') as HTMLButtonElement | null;
    this.toggleRightBtn = document.getElementById('toggle-right-btn') as HTMLButtonElement | null;
    this.expandLeftBtn = document.getElementById('expand-left-btn') as HTMLButtonElement | null;
    this.expandRightBtn = document.getElementById('expand-right-btn') as HTMLButtonElement | null;

    this.gameplayContainer = document.querySelector('.gameplay-3frame-container');
    this.btnNavDevotees = document.getElementById('btn-mobile-nav-devotees') as HTMLButtonElement | null;
    this.btnNavUnlocks = document.getElementById('btn-mobile-nav-unlocks') as HTMLButtonElement | null;
    this.badgeNavDevotees = document.getElementById('badge-nav-devotees');
    this.badgeNavUnlocks = document.getElementById('badge-nav-unlocks');

    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement | null;
  }

  private bindEvents(): void {
    // Start Game
    this.playBtn?.addEventListener('click', () => {
      this.audio.init();
      this.audio.playMusic();
      this.switchScreen('gameplay');
      this.audio.playTone(440, 'sine', 0.1);
    });

    // Panels Toggle
    this.toggleLeftBtn?.addEventListener('click', () => {
      if (window.innerWidth <= 860) {
        this.setMobileView('sphere');
      } else {
        this.togglePanel('left', false);
      }
    });
    this.expandLeftBtn?.addEventListener('click', () => this.togglePanel('left', true));

    this.toggleRightBtn?.addEventListener('click', () => {
      if (window.innerWidth <= 860) {
        this.setMobileView('sphere');
      } else {
        this.togglePanel('right', false);
      }
    });
    this.expandRightBtn?.addEventListener('click', () => this.togglePanel('right', true));

    // Mobile Bottom Navigation Bar Events
    this.btnNavDevotees?.addEventListener('click', () => {
      this.triggerHaptic(8);
      if (this.currentMobileView === 'left') {
        this.setMobileView('sphere');
      } else {
        this.setMobileView('left');
      }
    });

    this.btnNavUnlocks?.addEventListener('click', () => {
      this.triggerHaptic(8);
      if (this.currentMobileView === 'right') {
        this.setMobileView('sphere');
      } else {
        this.setMobileView('right');
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth <= 860) {
        this.gameplayContainer?.setAttribute('data-mobile-view', this.currentMobileView);
      }
    });

    // Tab buttons switching
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('.panel-tab-btn');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.getAttribute('data-panel') as 'left' | 'right';
        const targetTab = btn.getAttribute('data-tab')!;
        this.switchTab(panel, targetTab, btn);
        this.audio.playTone(550, 'sine', 0.05);
      });
    });
  }

  public switchScreen(screen: 'start' | 'gameplay'): void {
    if (screen === 'gameplay') {
      this.startScreen?.classList.remove('active');
      this.gameplayScreen?.classList.add('active');
    } else {
      this.gameplayScreen?.classList.remove('active');
      this.startScreen?.classList.add('active');
    }
    this.onScreenSwitched?.(screen);
  }

  public togglePanel(side: 'left' | 'right', open: boolean): void {
    this.audio.init();
    this.audio.playTone(open ? 400 : 320, 'triangle', 0.08);

    const panel = side === 'left' ? this.panelLeft : this.panelRight;
    const expandBtn = side === 'left' ? this.expandLeftBtn : this.expandRightBtn;

    if (open) {
      panel?.classList.remove('collapsed');
      expandBtn?.classList.remove('visible');
    } else {
      panel?.classList.add('collapsed');
      expandBtn?.classList.add('visible');
    }
  }

  public switchTab(panel: 'left' | 'right', targetTabId: string, clickedBtn: HTMLButtonElement): void {
    const parentAside = panel === 'left' ? this.panelLeft : this.panelRight;
    if (!parentAside) return;

    parentAside.querySelectorAll<HTMLButtonElement>('.panel-tab-btn').forEach((btn) => {
      btn.classList.remove('active');
    });
    clickedBtn.classList.add('active');

    parentAside.querySelectorAll<HTMLElement>('.tab-pane').forEach((pane) => {
      pane.classList.remove('active');
    });

    const targetPane = document.getElementById(targetTabId);
    if (targetPane) {
      targetPane.classList.add('active');
    }

    this.onTabSwitched?.(panel, targetTabId);
    events.emit(GameEvents.TAB_CHANGED, targetTabId);
  }

  public setMobileView(view: 'sphere' | 'left' | 'right'): void {
    this.currentMobileView = view;
    this.gameplayContainer?.setAttribute('data-mobile-view', view);

    this.btnNavDevotees?.classList.toggle('active', view === 'left');
    this.btnNavUnlocks?.classList.toggle('active', view === 'right');

    if (view === 'left') {
      const activeTab = this.panelLeft?.querySelector('.tab-pane.active')?.id;
      if (activeTab) {
        this.onTabSwitched?.('left', activeTab);
      }
    }
  }

  public getMobileView(): 'sphere' | 'left' | 'right' {
    return this.currentMobileView;
  }

  public updateBadges(hasDevoteesAlert: boolean, hasUnlocksAlert: boolean): void {
    if (this.badgeNavDevotees) {
      this.badgeNavDevotees.style.display = hasDevoteesAlert ? 'block' : 'none';
    }
    if (this.badgeNavUnlocks) {
      this.badgeNavUnlocks.style.display = hasUnlocksAlert ? 'block' : 'none';
    }
  }
}
