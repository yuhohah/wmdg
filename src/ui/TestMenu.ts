import { formatNumber } from '../systems/numberFormat.js';
import { INCARNATION_STAGES } from '../config/incarnation.js';
import type { BenchmarkWorkerMessage } from '../benchmark/types.js';
import { formatHtmlReport } from '../benchmark/reporters.js';
import { SaveSystem } from '../systems/saveSystem.js';
import { icon } from './icons.js';

export type TestResourceKey = 'faith' | 'fervor' | 'relics' | 'gnose' | 'followers';

export function parseResourceInput(raw: string): number {
  const cleaned = raw.trim().replace(/\s+/g, '');
  if (!cleaned) return NaN;

  // Suporta sufixos K, M, B, T, Q (ex: 100k, 1.5M, 2B)
  const suffixMatch = cleaned.match(/^([+-]?\d+(?:[.,]\d+)?)\s*([kmbtq])$/i);
  if (suffixMatch) {
    const base = Number(suffixMatch[1].replace(',', '.'));
    const suffix = suffixMatch[2].toLowerCase();
    const mults: Record<string, number> = {
      k: 1e3,
      m: 1e6,
      b: 1e9,
      t: 1e12,
      q: 1e15
    };
    return base * (mults[suffix] ?? 1);
  }

  // Suporta separador de milhar em pt-BR (ex: 100.000 ou 1.000.000)
  if (/^[+-]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    return Number(normalized);
  }

  // Número padrão ou notação científica (ex: 100000, 1e15, 2,5e10)
  return Number(cleaned.replace(',', '.'));
}

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
      this.speedLabelEl.textContent = `${formatNumber(speed)}x`;
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
        badge.textContent = `${formatNumber(speed)}x`;
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
    launcher.innerHTML = `<span class="test-launcher-icon">${icon('gear')}</span> <span class="test-launcher-badge">1e0x</span>`;
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
              <span id="test-current-speed-label" class="test-current-speed-tag">1e0x</span>
            </div>
            <div class="test-speed-grid">
              <button class="test-btn test-speed-btn" data-speed="0">Pausar (0e0x)</button>
              <button class="test-btn test-speed-btn active" data-speed="1">1e0x Normal</button>
              <button class="test-btn test-speed-btn" data-speed="2">2e0x</button>
              <button class="test-btn test-speed-btn" data-speed="5">5e0x</button>
              <button class="test-btn test-speed-btn" data-speed="10">1e1x</button>
              <button class="test-btn test-speed-btn test-speed-max" data-speed="100">1e2x</button>
            </div>
          </div>

          <!-- SEÇÃO 2: CONCESSÃO DE RECURSOS POR INPUT -->
          <div class="test-section">
            <div class="test-section-header">
              <span class="test-section-title">${icon('gem')} CONCESSÃO DE RECURSOS</span>
              <span class="test-section-subtitle">Notação científica: 1e5, 2.5e6, 1e15</span>
            </div>
            <div class="test-resource-list">
              <div class="test-resource-row">
                <label class="test-resource-label" for="test-input-faith">${icon('star')} <span>Fé</span></label>
                <input id="test-input-faith" type="text" inputmode="text" class="test-resource-input" data-resource-input="faith" value="1e5" placeholder="Valor de Fé..." />
                <button type="button" class="test-btn test-resource-btn" data-resource-add="faith">+ Adicionar</button>
                <button type="button" class="test-btn test-resource-set-btn" data-resource-set="faith">Definir</button>
              </div>
              <div class="test-resource-row">
                <label class="test-resource-label" for="test-input-fervor">${icon('fervor')} <span>Fervor</span></label>
                <input id="test-input-fervor" type="text" inputmode="text" class="test-resource-input" data-resource-input="fervor" value="1e4" placeholder="Valor de Fervor..." />
                <button type="button" class="test-btn test-resource-btn" data-resource-add="fervor">+ Adicionar</button>
                <button type="button" class="test-btn test-resource-set-btn" data-resource-set="fervor">Definir</button>
              </div>
              <div class="test-resource-row">
                <label class="test-resource-label" for="test-input-relics">${icon('gem')} <span>Relíquias</span></label>
                <input id="test-input-relics" type="text" inputmode="text" class="test-resource-input" data-resource-input="relics" value="1e2" placeholder="Valor de Relíquias..." />
                <button type="button" class="test-btn test-resource-btn" data-resource-add="relics">+ Adicionar</button>
                <button type="button" class="test-btn test-resource-set-btn" data-resource-set="relics">Definir</button>
              </div>
              <div class="test-resource-row">
                <label class="test-resource-label" for="test-input-gnose">${icon('gnose')} <span>Gnose</span></label>
                <input id="test-input-gnose" type="text" inputmode="text" class="test-resource-input" data-resource-input="gnose" value="1e1" placeholder="Valor de Gnose..." />
                <button type="button" class="test-btn test-resource-btn" data-resource-add="gnose">+ Adicionar</button>
                <button type="button" class="test-btn test-resource-set-btn" data-resource-set="gnose">Definir</button>
              </div>
              <div class="test-resource-row">
                <label class="test-resource-label" for="test-input-followers">${icon('followers')} <span>Fiéis</span></label>
                <input id="test-input-followers" type="text" inputmode="text" class="test-resource-input" data-resource-input="followers" value="1e1" placeholder="Qtd. de Fiéis..." />
                <button type="button" class="test-btn test-resource-btn" data-resource-add="followers">+ Adicionar</button>
                <button type="button" class="test-btn test-resource-set-btn" data-resource-set="followers">Definir</button>
              </div>
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

    // Resource input actions (+ Adicionar / Definir / Enter)
    const addBtns = overlay.querySelectorAll<HTMLButtonElement>('[data-resource-add]');
    addBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const res = btn.getAttribute('data-resource-add') as TestResourceKey | null;
        if (res) {
          this.applyResourceInput(res, 'add');
        }
      });
    });

    const setBtns = overlay.querySelectorAll<HTMLButtonElement>('[data-resource-set]');
    setBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const res = btn.getAttribute('data-resource-set') as TestResourceKey | null;
        if (res) {
          this.applyResourceInput(res, 'set');
        }
      });
    });

    const resourceInputs = overlay.querySelectorAll<HTMLInputElement>('[data-resource-input]');
    resourceInputs.forEach((input) => {
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const res = input.getAttribute('data-resource-input') as TestResourceKey | null;
          if (res) {
            this.applyResourceInput(res, 'add');
          }
        }
      });
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

  private applyResourceInput(resource: TestResourceKey, mode: 'add' | 'set'): void {
    const gs = this.game.gameState;
    if (!gs || !this.overlayEl) return;

    const input = this.overlayEl.querySelector<HTMLInputElement>(`[data-resource-input="${resource}"]`);
    if (!input) return;

    const amount = parseResourceInput(input.value);
    if (!Number.isFinite(amount)) {
      input.classList.add('input-error');
      setTimeout(() => input.classList.remove('input-error'), 400);
      return;
    }

    switch (resource) {
      case 'faith': {
        if (mode === 'add') {
          gs.faithPoints = Math.max(0, gs.faithPoints + amount);
          if (amount > 0) {
            gs.totalFaithAccumulated += amount;
          }
        } else {
          gs.faithPoints = Math.max(0, amount);
          gs.totalFaithAccumulated = Math.max(gs.totalFaithAccumulated, gs.faithPoints);
        }
        break;
      }
      case 'fervor': {
        if (mode === 'add') {
          if (amount >= 0) {
            gs.addFervor(amount);
          } else {
            gs.fervorPoints = Math.max(0, gs.fervorPoints + amount);
          }
        } else {
          gs.fervorPoints = Math.max(0, amount);
          gs.totalFervorGenerated = Math.max(gs.totalFervorGenerated, gs.fervorPoints);
          gs.fervorPeakThisRun = Math.max(gs.fervorPeakThisRun, gs.fervorPoints);
        }
        break;
      }
      case 'relics': {
        if (mode === 'add') {
          if (amount >= 0) {
            gs.addRelics(amount);
          } else {
            gs.relicPoints = Math.max(0, gs.relicPoints + amount);
          }
        } else {
          gs.relicPoints = Math.max(0, amount);
          gs.totalRelicsGenerated = Math.max(gs.totalRelicsGenerated, gs.relicPoints);
          gs.relicPeakThisRun = Math.max(gs.relicPeakThisRun, gs.relicPoints);
        }
        break;
      }
      case 'gnose': {
        if (mode === 'add') {
          gs.gnosePoints = Math.max(0, gs.gnosePoints + amount);
          if (amount > 0) {
            gs.totalGnoseEarned += amount;
          }
        } else {
          gs.gnosePoints = Math.max(0, amount);
          gs.totalGnoseEarned = Math.max(gs.totalGnoseEarned, gs.gnosePoints);
        }
        break;
      }
      case 'followers': {
        const count = Math.floor(amount);
        if (gs.followers && gs.followers[0]) {
          if (mode === 'add') {
            gs.followers[0].count = Math.max(0, gs.followers[0].count + count);
            if (count > 0) {
              this.game.followersTab?.arena?.onFollowersAdded(count);
            }
          } else {
            const nextCount = Math.max(0, count);
            const diff = nextCount - gs.followers[0].count;
            gs.followers[0].count = nextCount;
            if (diff > 0) {
              this.game.followersTab?.arena?.onFollowersAdded(diff);
            }
          }
        }
        break;
      }
    }

    this.game.refreshAllUI?.();
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
      } else if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        target.blur();
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
