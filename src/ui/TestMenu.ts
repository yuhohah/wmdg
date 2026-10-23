import { INCARNATION_STAGES } from '../config/incarnation.js';

export class TestMenu {
  private game: any;
  private currentSpeed: number = 1;
  private isOpen: boolean = false;
  private overlayEl: HTMLElement | null = null;
  private launcherBtn: HTMLElement | null = null;
  private speedLabelEl: HTMLElement | null = null;
  private speedButtons: Map<number, HTMLButtonElement> = new Map();

  constructor(game: any) {
    this.game = game;
    this.initDOM();
    this.setupEvents();
  }

  public setSpeed(speed: number): void {
    this.currentSpeed = speed;

    // Apply to GameLoop
    if (this.game.gameLoop) {
      this.game.gameLoop.setSpeedMultiplier(speed);
    }

    // Apply to FollowersArena
    if (this.game.followersTab?.arena) {
      this.game.followersTab.arena.setSpeedMultiplier(speed);
    }

    // Update UI highlights
    this.speedButtons.forEach((btn, s) => {
      if (s === speed) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (this.speedLabelEl) {
      this.speedLabelEl.textContent = speed === 0 ? 'Pausado (0x)' : `${speed}x`;
    }

    if (this.launcherBtn) {
      const tag = speed === 0 ? '⏸️ 0x' : `⚡ ${speed}x`;
      this.launcherBtn.innerHTML = `<span class="test-launcher-icon">🛠️</span> <span class="test-launcher-badge">${tag}</span>`;
      if (speed > 1) {
        this.launcherBtn.classList.add('boosted');
      } else {
        this.launcherBtn.classList.remove('boosted');
      }
    }
  }

  public getSpeed(): number {
    return this.currentSpeed;
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public open(): void {
    this.isOpen = true;
    if (this.overlayEl) {
      this.overlayEl.classList.add('visible');
    }
  }

  public close(): void {
    this.isOpen = false;
    if (this.overlayEl) {
      this.overlayEl.classList.remove('visible');
    }
  }

  private initDOM(): void {
    // 1. Create floating launcher button
    const launcher = document.createElement('button');
    launcher.id = 'test-menu-launcher';
    launcher.className = 'test-menu-launcher';
    launcher.innerHTML = `<span class="test-launcher-icon">🛠️</span> <span class="test-launcher-badge">⚡ 1x</span>`;
    launcher.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    document.body.appendChild(launcher);
    this.launcherBtn = launcher;

    // 2. Create Modal / Overlay
    const overlay = document.createElement('div');
    overlay.id = 'test-menu-overlay';
    overlay.className = 'test-menu-overlay';
    overlay.innerHTML = `
      <div class="test-menu-modal" role="dialog" aria-modal="true" aria-label="Menu de Testes">
        <div class="test-menu-header">
          <div class="test-menu-title-group">
            <span class="test-menu-icon">⚙️</span>
            <h2 class="test-menu-title">PAINEL DE TESTES DO CULTO</h2>
          </div>
          <button id="test-menu-close-btn" class="test-menu-close-btn" aria-label="Fechar">✕</button>
        </div>

        <div class="test-menu-body">
          <!-- SEÇÃO 1: VELOCIDADE -->
          <div class="test-section">
            <div class="test-section-header">
              <span class="test-section-title">⏱️ MODIFICADORES DE VELOCIDADE</span>
              <span id="test-current-speed-label" class="test-current-speed-tag">1x</span>
            </div>
            <div class="test-speed-grid">
              <button class="test-btn test-speed-btn" data-speed="0">Pausar (0x)</button>
              <button class="test-btn test-speed-btn active" data-speed="1">1x Normal</button>
              <button class="test-btn test-speed-btn" data-speed="2">2x</button>
              <button class="test-btn test-speed-btn" data-speed="5">5x</button>
              <button class="test-btn test-speed-btn" data-speed="10">10x</button>
              <button class="test-btn test-speed-btn test-speed-max" data-speed="100">⚡ 100x</button>
            </div>
          </div>

          <!-- SEÇÃO 2: RECURSOS RÁPIDOS -->
          <div class="test-section">
            <div class="test-section-header">
              <span class="test-section-title">💎 CONCESSÃO DE RECURSOS</span>
            </div>
            <div class="test-grid">
              <button class="test-btn test-action-btn" data-action="add-faith-100k">+100.000 Fé</button>
              <button class="test-btn test-action-btn" data-action="add-faith-1m">+1.000.000 Fé</button>
              <button class="test-btn test-action-btn" data-action="add-fervor-10k">+10.000 Fervor</button>
              <button class="test-btn test-action-btn" data-action="add-fervor-100k">+100.000 Fervor</button>
              <button class="test-btn test-action-btn" data-action="add-relics-100">+100 Relíquias</button>
              <button class="test-btn test-action-btn" data-action="add-relics-1k">+1.000 Relíquias</button>
              <button class="test-btn test-action-btn" data-action="add-gnose-10">+10 Gnose</button>
              <button class="test-btn test-action-btn" data-action="add-gnose-50">+50 Gnose</button>
              <button class="test-btn test-action-btn" data-action="add-followers-10">+10 Fiéis</button>
              <button class="test-btn test-action-btn" data-action="add-followers-50">+50 Fiéis</button>
            </div>
          </div>

          <!-- SEÇÃO 3: MECÂNICAS & ESTADO -->
          <div class="test-section">
            <div class="test-section-header">
              <span class="test-section-title">🔮 ESTADO & PROGRESSÃO</span>
            </div>
            <div class="test-grid">
              <button class="test-btn test-action-btn test-highlight" data-action="unlock-all">Desbloquear Todas as Mecânicas</button>
              <button class="test-btn test-action-btn test-highlight" data-action="advance-incarnation">Evoluir Encarnação (+1)</button>
              <button class="test-btn test-action-btn" data-action="trigger-miracle">Disparar Pedido de Milagre</button>
              <button class="test-btn test-action-btn test-danger" data-action="reset-progress">Resetar Todo o Progresso</button>
            </div>
          </div>
        </div>

        <div class="test-menu-footer">
          <span>Atalho de Teclado: <strong>[T]</strong> ou <strong>[F2]</strong></span>
          <span class="test-menu-hint">Modificadores aceleram simulação, acúmulos e animações.</span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayEl = overlay;
    this.speedLabelEl = overlay.querySelector('#test-current-speed-label');

    // Cache speed buttons
    const speedBtns = overlay.querySelectorAll<HTMLButtonElement>('.test-speed-btn');
    speedBtns.forEach((btn) => {
      const spd = Number(btn.getAttribute('data-speed'));
      this.speedButtons.set(spd, btn);
      btn.addEventListener('click', () => {
        this.setSpeed(spd);
      });
    });

    // Close button
    const closeBtn = overlay.querySelector('#test-menu-close-btn');
    closeBtn?.addEventListener('click', () => {
      this.close();
    });

    // Close when clicking outside modal
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    // Action buttons
    const actionBtns = overlay.querySelectorAll<HTMLButtonElement>('.test-action-btn');
    actionBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        if (action) {
          this.executeAction(action);
        }
      });
    });
  }

  private setupEvents(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if (!isInput) {
        if (e.key === 't' || e.key === 'T' || e.key === 'F2') {
          e.preventDefault();
          this.toggle();
        } else if (e.key === 'Escape' && this.isOpen) {
          e.preventDefault();
          this.close();
        }
      }
    });
  }

  private executeAction(action: string): void {
    const gs = this.game.gameState;
    if (!gs) return;

    switch (action) {
      case 'add-faith-100k':
        gs.faithPoints += 100000;
        gs.totalFaithAccumulated += 100000;
        break;
      case 'add-faith-1m':
        gs.faithPoints += 1000000;
        gs.totalFaithAccumulated += 1000000;
        break;
      case 'add-fervor-10k':
        gs.fervorPoints += 10000;
        break;
      case 'add-fervor-100k':
        gs.fervorPoints += 100000;
        break;
      case 'add-relics-100':
        gs.relicPoints += 100;
        break;
      case 'add-relics-1k':
        gs.relicPoints += 1000;
        break;
      case 'add-gnose-10':
        gs.gnosePoints += 10;
        gs.totalGnoseEarned += 10;
        break;
      case 'add-gnose-50':
        gs.gnosePoints += 50;
        gs.totalGnoseEarned += 50;
        break;
      case 'add-followers-10':
        if (gs.followers && gs.followers[0]) {
          gs.followers[0].count += 10;
          this.game.followersTab?.arena?.onFollowersAdded(10);
        }
        break;
      case 'add-followers-50':
        if (gs.followers && gs.followers[0]) {
          gs.followers[0].count += 50;
          this.game.followersTab?.arena?.onFollowersAdded(50);
        }
        break;
      case 'unlock-all':
        if (gs.unlocks) {
          gs.unlocks.forEach((u: any) => {
            u.unlocked = true;
          });
        }
        break;
      case 'advance-incarnation':
        if (gs.incarnationStage < INCARNATION_STAGES.length) {
          gs.incarnationStage++;
          this.game.incarnationTab?.altar?.evolveToStage(gs.incarnationStage);
        }
        break;
      case 'trigger-miracle':
        this.game.followersTab?.triggerMiraclePlea();
        break;
      case 'reset-progress':
        if (confirm('Deseja realmente resetar todos os dados de progresso e save?')) {
          localStorage.clear();
          window.location.reload();
        }
        return;
    }

    this.game.refreshAllUI?.();
  }
}
