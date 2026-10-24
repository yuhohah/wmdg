import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { GNOSE_UPGRADES, GNOSE_TIER_LABELS, GNOSE_MIN_FAITH_REQ } from '../../config/gnose.js';
import { DISPLAY_CONFIG } from '../../config/display.js';
import { formatNumber } from '../../systems/calculations.js';
import { cultDialog } from '../../ui/CultDialog.js';
import { BossBattleModal } from './BossBattleModal.js';
import type { GnoseUpgrade } from '../../types.js';

export interface GnoseTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  notifications: NotificationManager;
  spawnFloatingText: (x: number, y: number, text: string) => void;
  onGnoseReset?: () => void;
  onUpgradePurchased?: (upg: GnoseUpgrade) => void;
}

export class GnoseTab {
  private options: GnoseTabOptions;
  public bossBattleModal: BossBattleModal;

  private hudDividerEl: HTMLElement | null = null;
  private hudItemEl: HTMLElement | null = null;

  private btnGnoseResetEl: HTMLButtonElement | null = null;
  private gnoseToGetEl: HTMLElement | null = null;
  private gnoseReqHintEl: HTMLElement | null = null;
  private gnoseBalanceValEl: HTMLElement | null = null;
  private gnoseTotalValEl: HTMLElement | null = null;
  private gnosePassiveMultValEl: HTMLElement | null = null;
  private gnoseResetsValEl: HTMLElement | null = null;

  private confirmToggleEl: HTMLInputElement | null = null;
  private automationPanelEl: HTMLElement | null = null;
  private autoFollowersWrapEl: HTMLElement | null = null;
  private autoFollowersToggleEl: HTMLInputElement | null = null;
  private autoFervorWrapEl: HTMLElement | null = null;
  private autoFervorToggleEl: HTMLInputElement | null = null;
  private autoRelicsWrapEl: HTMLElement | null = null;
  private autoRelicsToggleEl: HTMLInputElement | null = null;

  private treeContainerEl: HTMLElement | null = null;

  constructor(options: GnoseTabOptions) {
    this.options = options;
    this.bossBattleModal = new BossBattleModal({
      gameState: options.gameState,
      audio: options.audio,
      notifications: options.notifications,
      spawnFloatingText: options.spawnFloatingText,
      onBattleEnded: () => {
        this.renderTree();
        this.updateUI();
        this.options.onUpgradePurchased?.(GNOSE_UPGRADES[0]);
      }
    });
    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    this.hudDividerEl = document.getElementById('hud-gnose-divider');
    this.hudItemEl = document.getElementById('hud-gnose-item');

    this.btnGnoseResetEl = document.getElementById('btn-gnose-reset') as HTMLButtonElement | null;
    this.gnoseToGetEl = document.getElementById('gnose-to-get');
    this.gnoseReqHintEl = document.getElementById('gnose-req-hint');
    this.gnoseBalanceValEl = document.getElementById('gnose-balance-val');
    this.gnoseTotalValEl = document.getElementById('gnose-total-val');
    this.gnosePassiveMultValEl = document.getElementById('gnose-passive-mult-val');
    this.gnoseResetsValEl = document.getElementById('gnose-resets-val');

    this.confirmToggleEl = document.getElementById('gnose-confirm-toggle') as HTMLInputElement | null;
    this.automationPanelEl = document.getElementById('gnose-automation-panel');
    this.autoFollowersWrapEl = document.getElementById('gnose-auto-followers-wrap');
    this.autoFollowersToggleEl = document.getElementById('gnose-auto-followers-toggle') as HTMLInputElement | null;
    this.autoFervorWrapEl = document.getElementById('gnose-auto-fervor-wrap');
    this.autoFervorToggleEl = document.getElementById('gnose-auto-fervor-toggle') as HTMLInputElement | null;
    this.autoRelicsWrapEl = document.getElementById('gnose-auto-relics-wrap');
    this.autoRelicsToggleEl = document.getElementById('gnose-auto-relics-toggle') as HTMLInputElement | null;

    this.treeContainerEl = document.getElementById('gnose-upgrades-tree');
  }

  private bindEvents(): void {
    this.btnGnoseResetEl?.addEventListener('click', () => {
      void this.handleResetClick();
    });

    this.confirmToggleEl?.addEventListener('change', () => {
      this.options.gameState.confirmGnoseReset = !!this.confirmToggleEl?.checked;
    });

    this.autoFollowersToggleEl?.addEventListener('change', () => {
      this.options.gameState.autoFollowersEnabled = !!this.autoFollowersToggleEl?.checked;
    });

    this.autoFervorToggleEl?.addEventListener('change', () => {
      this.options.gameState.autoFervorEnabled = !!this.autoFervorToggleEl?.checked;
    });

    this.autoRelicsToggleEl?.addEventListener('change', () => {
      this.options.gameState.autoRelicsEnabled = !!this.autoRelicsToggleEl?.checked;
    });
  }

  public async handleResetClick(): Promise<void> {
    const toGet = this.options.gameState.getGnoseToGet();
    if (toGet <= 0) {
      this.options.audio.playTone(180, 'sawtooth', 0.1);
      return;
    }

    if (this.options.gameState.confirmGnoseReset) {
      const keepSelos = this.options.gameState.hasGnoseUpgrade('gn_memoria_selos');
      const keepRelics = this.options.gameState.hasGnoseUpgrade('gn_keep_relics');
      const details = [
        `Você receberá +${formatNumber(toGet)} Gnose.`,
        keepSelos
          ? 'Seus Selos permanecerão abertos (Memória Hermética).'
          : 'Fé, Fiéis, Fervor, Relíquias e os Selos iniciais serão reiniciados.',
        keepRelics ? 'Os níveis de suas Relíquias serão preservados (Cripta Eterna).' : ''
      ]
        .filter(Boolean)
        .join(' ');

      const confirmed = await cultDialog(
        'Ascensão Gnóstica',
        `Dissolver o culto terreno para ascender no Nous? ${details}`,
        'Ascender',
        'Cancelar'
      );
      if (!confirmed) return;
    }

    this.executeGnoseReset();
  }

  public executeGnoseReset(): void {
    const result = this.options.gameState.performGnoseReset();
    if (result.success && result.gained > 0) {
      this.options.audio.playChime();
      this.options.spawnFloatingText(
        window.innerWidth / 2,
        window.innerHeight / 2,
        `+${formatNumber(result.gained)} GNOSE!`
      );
      this.options.notifications.showCustomPopup(
        'ASCENSÃO GNÓSTICA',
        `O templo dissolveu-se em pura Mente: +${formatNumber(result.gained)} Gnose assimilada.`,
        '👁️',
        'PRESTÍGIO'
      );
      this.updateUI();
      this.renderTree();
      this.options.onGnoseReset?.();
    }
  }

  public buyUpgrade(upg: GnoseUpgrade): void {
    const gs = this.options.gameState;
    if (!gs.isGnoseTierUnlocked(upg.tier)) {
      const guardian = gs.getBossForTier(upg.tier as 2 | 3 | 4);
      if (guardian && gs.canChallengeBoss(guardian.id)) {
        this.bossBattleModal.openForBoss(guardian.id);
        return;
      }
      this.options.audio.playTone(180, 'sawtooth', 0.1);
      return;
    }

    const success = gs.buyGnoseUpgrade(upg.id);
    if (success) {
      this.options.audio.playTone(820, 'triangle', 0.22);
      this.options.notifications.showCustomPopup(
        upg.name,
        upg.effectText,
        upg.icon || '✦',
        'GNOSE ASSIMILADA'
      );
      this.updateUI();
      this.renderTree();
      this.options.onUpgradePurchased?.(upg);
    } else {
      this.options.audio.playTone(180, 'sawtooth', 0.1);
    }
  }

  public renderTree(): void {
    if (!this.treeContainerEl) return;
    this.treeContainerEl.innerHTML = '';

    const gs = this.options.gameState;

    // Active curse banner (if player recently failed a boss trial)
    const curseBanner = document.createElement('div');
    curseBanner.id = 'gnose-curse-banner';
    curseBanner.className = 'gnose-curse-banner';
    curseBanner.style.display = gs.bossCurseTimerSec > 0 ? 'flex' : 'none';
    curseBanner.innerHTML = `
      <span>⚠️ <strong>Maldição dos Deuses Antigos:</strong> -25% Fé/s e Fervor/s</span>
      <span id="gnose-curse-timer-val">${Math.ceil(gs.bossCurseTimerSec)}s</span>
    `;
    this.treeContainerEl.appendChild(curseBanner);

    const tiersToRender: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

    tiersToRender.forEach((tier) => {
      const tierSection = document.createElement('div');
      tierSection.className = 'gnose-tier-section';

      const tierHeader = document.createElement('div');
      tierHeader.className = 'gnose-tier-header';
      const tierUpgrades = GNOSE_UPGRADES.filter((u) => u.tier === tier);
      const unlockedCount = tierUpgrades.filter((u) => gs.hasGnoseUpgrade(u.id)).length;

      let guardianBadgeHtml = '';
      if (tier === 2 || tier === 3 || tier === 4) {
        const guardian = gs.getBossForTier(tier);
        if (guardian) {
          const isTierOpen = gs.isGnoseTierUnlocked(tier);
          const canChallenge = gs.canChallengeBoss(guardian.id);
          if (isTierOpen) {
            guardianBadgeHtml = `
              <span class="gnose-guardian-badge defeated">
                ${guardian.symbol} ${guardian.name}: SUBJUGADO (×${guardian.faithFervorMult} Fé/Fervor)
              </span>
            `;
          } else {
            guardianBadgeHtml = `
              <button type="button" class="btn-challenge-guardian ${canChallenge ? 'ready' : 'locked'}" data-boss-id="${guardian.id}" ${canChallenge ? '' : 'disabled'}>
                ⚔️ Desafiar ${guardian.name} (${guardian.mythology}) — Destravar Tier
              </button>
            `;
          }
        }
      }

      tierHeader.innerHTML = `
        <span class="gnose-tier-title">${GNOSE_TIER_LABELS[tier]}</span>
        <div class="gnose-tier-right">
          ${guardianBadgeHtml}
          <span class="gnose-tier-progress">${unlockedCount}/${tierUpgrades.length}</span>
        </div>
      `;

      const challengeBtn = tierHeader.querySelector<HTMLButtonElement>('.btn-challenge-guardian');
      challengeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const bossId = challengeBtn.getAttribute('data-boss-id');
        if (bossId) {
          this.bossBattleModal.openForBoss(bossId);
        }
      });

      tierSection.appendChild(tierHeader);

      const tierGrid = document.createElement('div');
      tierGrid.className = 'gnose-tier-grid';

      const isTierUnlocked = gs.isGnoseTierUnlocked(tier);

      tierUpgrades.forEach((upg) => {
        const isUnlocked = gs.hasGnoseUpgrade(upg.id);
        const prereqsMet = isTierUnlocked && upg.prerequisites.every((reqId) => gs.hasGnoseUpgrade(reqId));
        const canAfford = gs.gnosePoints >= upg.cost;

        const stateClass = isUnlocked
          ? 'gnose-node-unlocked'
          : !prereqsMet
            ? 'gnose-node-locked-prereq'
            : canAfford
              ? 'gnose-node-available'
              : 'gnose-node-unaffordable';

        const nodeEl = document.createElement('div');
        nodeEl.className = `cult-action-card gnose-tree-node ${stateClass}`;
        nodeEl.id = `card-${upg.id}`;

        const symbolHtml = DISPLAY_CONFIG.showEmojisAndSymbols
          ? `<span class="gnose-node-symbol">${upg.icon}</span>`
          : '';

        const statusBadge = isUnlocked
          ? `<span class="gnose-node-badge unlocked">ASSIMILADO</span>`
          : !isTierUnlocked
            ? `<span class="gnose-node-badge locked">⚔️ Guardião (${formatNumber(upg.cost)} Gnose)</span>`
            : !prereqsMet
              ? `<span class="gnose-node-badge locked">🔒 ${formatNumber(upg.cost)} Gnose</span>`
              : `<span class="gnose-node-badge cost">${formatNumber(upg.cost)} Gnose</span>`;

        nodeEl.innerHTML = `
          <div class="gnose-node-top">
            ${symbolHtml}
            <span class="gnose-node-title">${upg.name}</span>
          </div>
          <div class="gnose-node-body">
            <p class="gnose-node-effect">${upg.effectText}</p>
          </div>
          <div class="gnose-node-footer">
            ${statusBadge}
          </div>
        `;

        nodeEl.addEventListener('click', () => {
          this.buyUpgrade(upg);
        });

        tierGrid.appendChild(nodeEl);
      });

      tierSection.appendChild(tierGrid);
      this.treeContainerEl!.appendChild(tierSection);
    });

    // ENDGAME BOSS FOOTER: TIAMAT (unlocked after 20/20 Gnose nodes)
    const tiamat = gs.getBossForTier('endgame');
    if (tiamat) {
      const totalUnlockedNodes = GNOSE_UPGRADES.filter((u) => gs.hasGnoseUpgrade(u.id)).length;
      const isTiamatDefeated = gs.isBossDefeated(tiamat.id);
      const canChallengeTiamat = gs.canChallengeBoss(tiamat.id);

      const endgameBar = document.createElement('div');
      endgameBar.className = `gnose-endgame-boss-bar ${isTiamatDefeated ? 'defeated' : canChallengeTiamat ? 'ready' : 'locked'}`;
      endgameBar.id = 'gnose-endgame-boss-bar';

      const actionHtml = isTiamatDefeated
        ? `<span class="gnose-guardian-badge defeated">👑 CREPÚSCULO DOS DEUSES CONCLUÍDO (×10 Fé & Fervor)</span>`
        : canChallengeTiamat
          ? `<button type="button" id="btn-challenge-tiamat" class="btn-challenge-guardian endgame-ready">🐉 Desafiar ${tiamat.name} (${tiamat.title})</button>`
          : `<span class="gnose-endgame-lock-hint">🔒 Assimile toda a Árvore da Gnose (${totalUnlockedNodes}/${GNOSE_UPGRADES.length}) para desafiar ${tiamat.name}</span>`;

      endgameBar.innerHTML = `
        <div class="gnose-endgame-info">
          <span class="gnose-endgame-title">${tiamat.symbol} APOTEOSE FINAL: ${tiamat.name.toUpperCase()} — ${tiamat.mythology.toUpperCase()}</span>
          <span class="gnose-endgame-desc">${tiamat.rewardDesc}</span>
        </div>
        <div class="gnose-endgame-action">
          ${actionHtml}
        </div>
      `;

      const tiamatBtn = endgameBar.querySelector<HTMLButtonElement>('#btn-challenge-tiamat');
      tiamatBtn?.addEventListener('click', () => {
        this.bossBattleModal.openForBoss(tiamat.id);
      });

      this.treeContainerEl.appendChild(endgameBar);
    }
  }

  public updateUI(): void {
    const gs = this.options.gameState;
    const toGet = gs.getGnoseToGet();

    if (this.gnoseToGetEl) {
      this.gnoseToGetEl.textContent = formatNumber(toGet);
    }

    if (this.gnoseReqHintEl) {
      if (gs.faithPoints >= GNOSE_MIN_FAITH_REQ) {
        this.gnoseReqHintEl.textContent = `Multiplicador de Gnose: ×${gs.getGnoseGainMultiplier().toFixed(1)}`;
      } else {
        this.gnoseReqHintEl.textContent = `Requer ${formatNumber(GNOSE_MIN_FAITH_REQ)} Fé (${formatNumber(Math.floor(gs.faithPoints))} / ${formatNumber(GNOSE_MIN_FAITH_REQ)})`;
      }
    }

    if (this.btnGnoseResetEl) {
      this.btnGnoseResetEl.disabled = toGet <= 0;
    }

    if (this.gnoseBalanceValEl) {
      this.gnoseBalanceValEl.textContent = formatNumber(gs.gnosePoints);
    }
    if (this.gnoseTotalValEl) {
      this.gnoseTotalValEl.textContent = formatNumber(gs.totalGnoseEarned);
    }
    if (this.gnosePassiveMultValEl) {
      this.gnosePassiveMultValEl.textContent = `×${formatNumber(gs.getTotalGnosePassiveMultiplier())}`;
    }
    if (this.gnoseResetsValEl) {
      this.gnoseResetsValEl.textContent = `${gs.gnoseResets}`;
    }

    if (this.confirmToggleEl) {
      this.confirmToggleEl.checked = gs.confirmGnoseReset;
    }

    const hasAutoFollowers = gs.hasGnoseUpgrade('gn_auto_followers');
    const hasAutoFervor = gs.hasGnoseUpgrade('gn_auto_fervor');
    const hasAutoRelics = gs.hasGnoseUpgrade('gn_auto_relics');

    if (this.automationPanelEl) {
      this.automationPanelEl.style.display =
        hasAutoFollowers || hasAutoFervor || hasAutoRelics ? 'flex' : 'none';
    }
    if (this.autoFollowersWrapEl) {
      this.autoFollowersWrapEl.style.display = hasAutoFollowers ? 'flex' : 'none';
    }
    if (this.autoFollowersToggleEl) {
      this.autoFollowersToggleEl.checked = gs.autoFollowersEnabled;
    }
    if (this.autoFervorWrapEl) {
      this.autoFervorWrapEl.style.display = hasAutoFervor ? 'flex' : 'none';
    }
    if (this.autoFervorToggleEl) {
      this.autoFervorToggleEl.checked = gs.autoFervorEnabled;
    }
    if (this.autoRelicsWrapEl) {
      this.autoRelicsWrapEl.style.display = hasAutoRelics ? 'flex' : 'none';
    }
    if (this.autoRelicsToggleEl) {
      this.autoRelicsToggleEl.checked = gs.autoRelicsEnabled;
    }

    // Update curse banner countdown
    const curseBanner = document.getElementById('gnose-curse-banner');
    const curseTimerVal = document.getElementById('gnose-curse-timer-val');
    if (curseBanner) {
      curseBanner.style.display = gs.bossCurseTimerSec > 0 ? 'flex' : 'none';
    }
    if (curseTimerVal && gs.bossCurseTimerSec > 0) {
      curseTimerVal.textContent = `${Math.ceil(gs.bossCurseTimerSec)}s`;
    }

    // Update active boss battle modal if open
    if (gs.activeBossBattle) {
      this.bossBattleModal.updateUI();
    }

    this.updateNodeStates();
  }

  public updateNodeStates(): void {
    const gs = this.options.gameState;
    GNOSE_UPGRADES.forEach((upg) => {
      const nodeEl = document.getElementById(`card-${upg.id}`);
      if (!nodeEl) return;

      const isUnlocked = gs.hasGnoseUpgrade(upg.id);
      const isTierUnlocked = gs.isGnoseTierUnlocked(upg.tier);
      const prereqsMet = isTierUnlocked && upg.prerequisites.every((reqId) => gs.hasGnoseUpgrade(reqId));
      const canAfford = gs.gnosePoints >= upg.cost;

      nodeEl.classList.remove(
        'gnose-node-unlocked',
        'gnose-node-locked-prereq',
        'gnose-node-available',
        'gnose-node-unaffordable'
      );

      if (isUnlocked) {
        nodeEl.classList.add('gnose-node-unlocked');
      } else if (!prereqsMet) {
        nodeEl.classList.add('gnose-node-locked-prereq');
      } else if (canAfford) {
        nodeEl.classList.add('gnose-node-available');
      } else {
        nodeEl.classList.add('gnose-node-unaffordable');
      }
    });
  }

  public setHudVisibility(unlocked: boolean): void {
    if (this.hudDividerEl) {
      this.hudDividerEl.style.display = unlocked ? 'block' : 'none';
    }
    if (this.hudItemEl) {
      this.hudItemEl.style.display = unlocked ? '' : 'none';
    }
  }
}
