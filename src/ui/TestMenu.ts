import { INCARNATION_STAGES } from '../config/incarnation.js';
import type { BenchmarkWorkerMessage } from '../benchmark/types.js';
import { formatHtmlReport } from '../benchmark/reporters.js';
import { SaveSystem } from '../systems/saveSystem.js';
import { icon } from './icons.js';

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

  public getCurrentSpeed(): number {
    return this.currentSpeed;
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
      this.speedLabelEl.textContent = `${speed}x`;
      if (speed === 0) {
        this.speedLabelEl.style.color = '#ef4444';
      } else if (speed > 1) {
        this.speedLabelEl.style.color = '#f59e0b';
      } else {
        this.speedLabelEl.style.color = '#10b981';
      }
    }

    // Update floating launcher badge
    if (this.launcherBtn) {
      const badge = this.launcherBtn.querySelector('.test-launcher-badge');
      if (badge) {
        badge.textContent = `${speed}x`;
      }
    }
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
    launcher.innerHTML = `<span class="test-launcher-icon">${icon('gear')}</span> <span class="test-launcher-badge">1x</span>`;
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
            <span class="test-menu-icon">${icon('gear')}</span>
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
              <button class="test-btn test-speed-btn test-speed-max" data-speed="100">100x</button>
            </div>
          </div>

          <!-- SEÇÃO 2: RECURSOS RÁPIDOS -->
          <div class="test-section">
            <div class="test-section-header">
              <span class="test-section-title">${icon('gem')} CONCESSÃO DE RECURSOS</span>
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
              <span class="test-section-title">${icon('orb')} ESTADO & PROGRESSÃO</span>
            </div>
            <div class="test-grid">
              <button class="test-btn test-action-btn test-highlight" data-action="unlock-all">Desbloquear Todas as Mecânicas</button>
              <button class="test-btn test-action-btn test-highlight" data-action="advance-incarnation">Evoluir Encarnação (+1)</button>
              <button class="test-btn test-action-btn" data-action="trigger-miracle">Disparar Pedido de Milagre</button>
              <button class="test-btn test-action-btn test-danger" data-action="reset-progress">Resetar Todo o Progresso</button>
            </div>
          </div>

          <!-- SEÇÃO 4: BENCHMARK ANALÍTICO DEFINITIVO -->
          <div class="test-section">
            <div class="test-section-header">
              <span class="test-section-title">${icon('chart')} SIMULAÇÃO DE PROGRESSÃO POR SESSÕES</span>
            </div>
            <div class="test-grid">
              <button id="run-benchmark-btn" class="test-btn test-action-btn test-highlight" data-action="run-progression-benchmark" style="grid-column: 1 / -1; background: linear-gradient(135deg, #b45309, #d97706); color: #fff; font-weight: bold; padding: 10px;">
                ${icon('bolt')} Simular Curva de Progressão (Referência vs Ativo intenso vs Casual vs AFK)
              </button>
            </div>
            <div id="benchmark-results-container" style="display: none; margin-top: 10px; max-height: 280px; overflow-y: auto; background: rgba(0,0,0,0.5); padding: 10px; border: 1px solid #d97706; border-radius: 6px;"></div>
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
      case 'run-progression-benchmark': {
        const container = this.overlayEl?.querySelector<HTMLElement>('#benchmark-results-container');
        const btn = this.overlayEl?.querySelector<HTMLButtonElement>('#run-benchmark-btn');
        if (container) {
          container.style.display = 'block';
          container.innerHTML = `<div style="color: #fbbf24; text-align: center; padding: 12px;">${icon('hourglass')} Preparando simulação por sessões (Referência, Ativo intenso, Casual, AFK)...</div>`;
          if (btn) btn.disabled = true;

          try {
            // Numerical reference simulations run off the main thread so the game keeps responding.
            const worker = new Worker(new URL('../benchmark/benchmark.worker.ts', import.meta.url), { type: 'module' });
            const finish = () => {
              worker.terminate();
              if (btn) btn.disabled = false;
            };
            worker.onmessage = (event: MessageEvent<BenchmarkWorkerMessage>) => {
              const message = event.data;
              if (message.kind === 'progress') {
                const names = { reference: 'Ativo de referência', active: 'Ativo', casual: 'Casual', afk: 'AFK' };
                container.textContent = `Simulando ${names[message.profile]} com visitas e passos de 0,1 s...`;
              } else {
                if (message.kind === 'done') container.innerHTML = formatHtmlReport(message.report);
                else container.textContent = `Erro ao rodar benchmark: ${message.message}`;
                finish();
              }
            };
            worker.onerror = (event) => {
              container.textContent = `Erro ao rodar benchmark: ${event.message}`;
              finish();
            };
            worker.postMessage({});
          } catch (error) {
            container.textContent = `Erro ao iniciar benchmark: ${String(error)}`;
            if (btn) btn.disabled = false;
          }
        }
        return;
      }
      case 'add-faith-100k':
        gs.faithPoints += 100000;
        gs.totalFaithAccumulated += 100000;
        break;
      case 'add-faith-1m':
        gs.faithPoints += 1000000;
        gs.totalFaithAccumulated += 1000000;
        break;
      case 'add-fervor-10k':
        gs.addFervor(10000);
        break;
      case 'add-fervor-100k':
        gs.addFervor(100000);
        break;
      case 'add-relics-100':
        gs.addRelics(100);
        break;
      case 'add-relics-1k':
        gs.addRelics(1000);
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
          this.game.isResetting = true;
          SaveSystem.resetSave();
          localStorage.clear();
          window.location.reload();
        }
        return;
    }

    this.game.refreshAllUI?.();
  }
}
