import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { GNOSE_UPGRADES, GNOSE_TIER_LABELS, GNOSE_MIN_FAITH_REQ } from '../../config/gnose.js';
import { GNOSE_BOSSES } from '../../config/bosses.js';
import { formatNumber } from '../../systems/calculations.js';
import { cultDialog } from '../../ui/CultDialog.js';
import { BossBattleModal } from './BossBattleModal.js';
import type { GnoseUpgrade } from '../../types.js';
import { icon, iconOrText } from '../../ui/icons.js';

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
  private treeContainerEl: HTMLElement | null = null;

  constructor(options: GnoseTabOptions) {
    this.options = options;
    this.bossBattleModal = new BossBattleModal({
      gameState: options.gameState,
      audio: options.audio,
      notifications: options.notifications,
      spawnFloatingText: options.spawnFloatingText,
      onBattleEnded: () => {
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
    this.treeContainerEl = document.getElementById('gnose-upgrades-tree');
  }

  private bindEvents(): void {
    this.btnGnoseResetEl?.addEventListener('click', () => {
      void this.handleResetClick();
    });

    this.confirmToggleEl?.addEventListener('change', () => {
      this.options.gameState.confirmGnoseReset = !!this.confirmToggleEl?.checked;
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
      const details = () => [
        `Você receberá +${formatNumber(this.options.gameState.getGnoseToGet())} Gnose. Perderá ${formatNumber(this.options.gameState.faithPoints)} Fé, ${this.options.gameState.getTotalFollowersCount()} Fiéis, ${formatNumber(this.options.gameState.fervorPoints)} Fervor, ${formatNumber(this.options.gameState.relicPoints)} Fragmentos, ${this.options.gameState.fervorUpgrades.reduce((sum, u) => sum + u.level, 0)} níveis de Ritos e o Avatar atual (estágio ${this.options.gameState.incarnationStage}). Os picos deste ciclo também zeram.`,
        keepSelos
          ? 'Memória Hermética preserva somente o Selo da Encarnação.'
          : 'Fé, Fiéis, Fervor, Relíquias e os Selos iniciais serão reiniciados.',
        keepRelics ? 'Os níveis de suas Relíquias serão preservados (Cripta Eterna).' : `Os ${this.options.gameState.relicUpgrades.reduce((sum, r) => sum + r.level, 0)} níveis de Relíquias serão perdidos.`
      ]
        .filter(Boolean)
        .join(' ');

      const confirmed = await cultDialog(
        'Ascensão Gnóstica',
        () => `Dissolver o culto terreno para ascender no Nous? ${details()}`,
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
        'gnose',
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
        upg.icon || 'star',
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
      <span>${icon('warning')} <strong>Maldição dos Deuses Antigos:</strong> -25% Fé/s e Fervor/s</span>
      <span id="gnose-curse-timer-val">${Math.ceil(gs.bossCurseTimerSec)}s</span>
    `;
    this.treeContainerEl.appendChild(curseBanner);

    const tiersToRender: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

    tiersToRender.forEach((tier) => {
      const tierSection = document.createElement('div');
      tierSection.className = 'gnose-tier-section';
      tierSection.dataset.tier = String(tier);

      const tierHeader = document.createElement('div');
      tierHeader.className = 'gnose-tier-header';
      const tierUpgrades = GNOSE_UPGRADES.filter((u) => u.tier === tier);
      const unlockedCount = tierUpgrades.filter((u) => gs.hasGnoseUpgrade(u.id)).length;

      let guardianBadgeHtml = '';
      let guardianSealHtml = '';
      if (tier === 2 || tier === 3 || tier === 4) {
        const guardian = gs.getBossForTier(tier);
        if (guardian) {
          const isTierOpen = gs.isGnoseTierUnlocked(tier);
          const canChallenge = gs.canChallengeBoss(guardian.id);
          const breakdown = gs.getBossCombatBreakdown(guardian.id);
          const etaSec = Number.isFinite(breakdown.estimatedPassiveVictorySec)
            ? `~${Math.round(breakdown.estimatedPassiveVictorySec)}s`
            : '∞';
          if (isTierOpen) {
            guardianBadgeHtml = `
              <span class="gnose-guardian-badge defeated">
                ${iconOrText(guardian.symbol)} ${guardian.name}: SUBJUGADO (×${guardian.faithFervorMult} Fé/Fervor)
              </span>
            `;
          } else {
            const prevTier = (tier - 1) as 1 | 2 | 3;
            const prevTierOwned = GNOSE_UPGRADES.filter(
              (u) => u.tier === prevTier && gs.hasGnoseUpgrade(u.id)
            ).length;
            const gateHint =
              tier >= 3 && !canChallenge
                ? ` [Requer Tier ${prevTier === 2 ? 'II' : 'III'}: ${prevTierOwned}/2 nós]`
                : '';
            guardianSealHtml = `
              <div class="gnose-tier-seal" role="group" aria-label="Tier bloqueado por ${guardian.name}">
                <span class="gnose-seal-chain gnose-seal-chain-left" aria-hidden="true"></span>
                <span class="gnose-seal-chain gnose-seal-chain-right" aria-hidden="true"></span>
                <div class="gnose-tier-seal-content">
                  <span class="gnose-tier-padlock" aria-hidden="true">${icon('lock')}</span>
                  <span class="gnose-tier-seal-title">CONHECIMENTO SELADO</span>
                  <button type="button" class="btn-challenge-guardian ${canChallenge ? 'ready' : 'locked'}" data-boss-id="${guardian.id}" ${canChallenge ? '' : 'disabled'}>
                    ${icon('swords')} <span class="gnose-guardian-label">Desafiar ${guardian.name}</span>
                  </button>
                  <span class="gnose-guardian-requirement">${gateHint.trim() || 'Vença o Guardião para revelar os upgrades.'}</span>
                  <span class="gnose-guardian-power">Poder: ×${breakdown.totalResourceMultiplier.toFixed(2)} · -${(breakdown.passiveHpFractionPerSec * 100).toFixed(1)}%/s · ${etaSec}</span>
                </div>
              </div>
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

      tierSection.appendChild(tierHeader);

      const tierGrid = document.createElement('div');
      tierGrid.className = 'gnose-tier-grid';

      const isTierUnlocked = gs.isGnoseTierUnlocked(tier);
      if (!isTierUnlocked) {
        tierGrid.inert = true;
        tierGrid.setAttribute('aria-hidden', 'true');
        tierSection.classList.add('gnose-tier-sealed');
      }

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

        const nodeEl = document.createElement('button');
        nodeEl.type = 'button';
        nodeEl.disabled = !gs.canBuyGnoseUpgrade(upg);
        nodeEl.className = `cult-action-card gnose-tree-node ${stateClass}`;
        nodeEl.id = `card-${upg.id}`;
        nodeEl.title = isTierUnlocked ? upg.desc : '';

        const statusBadge = isUnlocked
          ? `<span class="gnose-node-badge unlocked">ASSIMILADO</span>`
          : !isTierUnlocked
            ? `<span class="gnose-node-badge locked">${icon('lock')} ${formatNumber(upg.cost)} Gnose</span>`
            : !prereqsMet
              ? `<span class="gnose-node-badge locked">${icon('lock')} ${formatNumber(upg.cost)} Gnose</span>`
              : `<span class="gnose-node-badge cost">${formatNumber(upg.cost)} Gnose</span>`;

        nodeEl.innerHTML = `
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

      const tierContent = document.createElement('div');
      tierContent.className = 'gnose-tier-content';
      tierContent.appendChild(tierGrid);
      if (guardianSealHtml) {
        tierContent.insertAdjacentHTML('beforeend', guardianSealHtml);
        const challengeBtn = tierContent.querySelector<HTMLButtonElement>('.btn-challenge-guardian');
        challengeBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          const bossId = challengeBtn.getAttribute('data-boss-id');
          if (bossId) this.bossBattleModal.openForBoss(bossId);
        });
      }
      tierSection.appendChild(tierContent);
      this.treeContainerEl!.appendChild(tierSection);
    });

    // ENDGAME BOSS FOOTER: TIAMAT (unlocked after completing the Gnose tree)
    const tiamat = gs.getBossForTier('endgame');
    if (tiamat) {
      const totalUnlockedNodes = GNOSE_UPGRADES.filter((u) => gs.hasGnoseUpgrade(u.id)).length;
      const isTiamatDefeated = gs.isBossDefeated(tiamat.id);
      const canChallengeTiamat = gs.canChallengeBoss(tiamat.id);
      const breakdown = gs.getBossCombatBreakdown(tiamat.id);
      const etaSec = Number.isFinite(breakdown.estimatedPassiveVictorySec)
        ? `~${Math.round(breakdown.estimatedPassiveVictorySec)}s`
        : '∞';

      const endgameBar = document.createElement('div');
      endgameBar.className = `gnose-endgame-boss-bar ${isTiamatDefeated ? 'defeated' : canChallengeTiamat ? 'ready' : 'locked'}`;
      endgameBar.id = 'gnose-endgame-boss-bar';

      const actionHtml = isTiamatDefeated
        ? `<span class="gnose-guardian-badge defeated">${icon('crown')} CREPÚSCULO DOS DEUSES CONCLUÍDO (×10 Fé & Fervor)</span>`
        : canChallengeTiamat
          ? `<button type="button" id="btn-challenge-tiamat" class="btn-challenge-guardian endgame-ready" data-boss-id="${tiamat.id}">${iconOrText(tiamat.symbol)} <span class="gnose-guardian-label">Desafiar ${tiamat.name} — Poder: ×${breakdown.totalResourceMultiplier.toFixed(2)} (-${(breakdown.passiveHpFractionPerSec * 100).toFixed(1)}%/s · ${etaSec})</span></button>`
          : `<span class="gnose-endgame-lock-hint" id="gnose-endgame-lock-hint">${icon('lock')} <span class="gnose-endgame-label">Assimile a Árvore da Gnose (${totalUnlockedNodes}/${GNOSE_UPGRADES.length}) • Poder Atual: ×${breakdown.totalResourceMultiplier.toFixed(2)} (-${(breakdown.passiveHpFractionPerSec * 100).toFixed(1)}%/s · ${etaSec})</span></span>`;

      endgameBar.innerHTML = `
        <div class="gnose-endgame-info">
          <span class="gnose-endgame-title">${iconOrText(tiamat.symbol)} APOTEOSE FINAL: ${tiamat.name.toUpperCase()} — ${tiamat.mythology.toUpperCase()}</span>
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
      this.setText(this.gnoseToGetEl, formatNumber(toGet));
    }

    if (this.gnoseReqHintEl) {
      if (gs.faithPoints >= GNOSE_MIN_FAITH_REQ) {
        this.setText(this.gnoseReqHintEl, `Curva da Ascensão: (Fé / 1Q)^${gs.getGnoseGainExponent().toFixed(2)}`);
      } else {
        this.setText(this.gnoseReqHintEl, `Requer ${formatNumber(GNOSE_MIN_FAITH_REQ)} Fé (${formatNumber(Math.floor(gs.faithPoints))} / ${formatNumber(GNOSE_MIN_FAITH_REQ)})`);
      }
    }

    if (this.btnGnoseResetEl) {
      if (this.btnGnoseResetEl.disabled !== (toGet <= 0)) this.btnGnoseResetEl.disabled = toGet <= 0;
    }

    if (this.gnoseBalanceValEl) {
      this.setText(this.gnoseBalanceValEl, formatNumber(gs.gnosePoints));
    }
    if (this.gnoseTotalValEl) {
      this.setText(this.gnoseTotalValEl, formatNumber(gs.totalGnoseEarned));
    }
    if (this.gnosePassiveMultValEl) {
      this.setText(this.gnosePassiveMultValEl, `×${formatNumber(gs.getTotalGnosePassiveMultiplier())}`);
    }
    if (this.gnoseResetsValEl) {
      this.setText(this.gnoseResetsValEl, `${gs.gnoseResets}`);
    }

    if (this.confirmToggleEl) {
      if (this.confirmToggleEl.checked !== (gs.confirmGnoseReset)) this.confirmToggleEl.checked = gs.confirmGnoseReset;
    }

    // Update curse banner countdown
    const curseBanner = document.getElementById('gnose-curse-banner');
    const curseTimerVal = document.getElementById('gnose-curse-timer-val');
    if (curseBanner) {
      this.setDisplay(curseBanner, gs.bossCurseTimerSec > 0 ? 'flex' : 'none');
    }
    if (curseTimerVal && gs.bossCurseTimerSec > 0) {
      this.setText(curseTimerVal, `${Math.ceil(gs.bossCurseTimerSec)}s`);
    }

    this.updateNodeStates();
  }

  public updateNodeStates(): void {
    const gs = this.options.gameState;
    GNOSE_UPGRADES.forEach((upg) => {
      // Covered grids stay static until the victory callback rebuilds the tier.
      if (!gs.isGnoseTierUnlocked(upg.tier)) return;
      const nodeEl = document.getElementById(`card-${upg.id}`);
      if (!nodeEl) return;

      const isUnlocked = gs.hasGnoseUpgrade(upg.id);
      const isTierUnlocked = gs.isGnoseTierUnlocked(upg.tier);
      const prereqsMet = isTierUnlocked && upg.prerequisites.every((reqId) => gs.hasGnoseUpgrade(reqId));
      const canAfford = gs.gnosePoints >= upg.cost;

      if (nodeEl instanceof HTMLButtonElement) nodeEl.disabled = !gs.canBuyGnoseUpgrade(upg);

      const stateClass = isUnlocked
        ? 'gnose-node-unlocked'
        : !prereqsMet
          ? 'gnose-node-locked-prereq'
          : canAfford
            ? 'gnose-node-available'
            : 'gnose-node-unaffordable';
      if (!nodeEl.classList.contains(stateClass)) {
        nodeEl.classList.remove(
          'gnose-node-unlocked',
          'gnose-node-locked-prereq',
          'gnose-node-available',
          'gnose-node-unaffordable'
        );
        nodeEl.classList.add(stateClass);
      }
    });

    // Dynamically update Guardian Boss challenge buttons & Endgame Boss bar as resources change
    if (this.treeContainerEl) {
      const bossBtns = this.treeContainerEl.querySelectorAll<HTMLButtonElement>('.btn-challenge-guardian[data-boss-id]');
      bossBtns.forEach((btn) => {
        const bossId = btn.getAttribute('data-boss-id');
        if (!bossId) return;
        const boss = GNOSE_BOSSES.find((b) => b.id === bossId);
        if (!boss) return;

        const canChallenge = gs.canChallengeBoss(bossId);
        const breakdown = gs.getBossCombatBreakdown(bossId);
        const etaSec = Number.isFinite(breakdown.estimatedPassiveVictorySec)
          ? `~${Math.round(breakdown.estimatedPassiveVictorySec)}s`
          : '∞';
        if (btn.disabled !== !canChallenge) btn.disabled = !canChallenge;
        if (btn.classList.contains('ready') !== canChallenge) btn.classList.toggle('ready', canChallenge);
        if (btn.classList.contains('locked') === canChallenge) btn.classList.toggle('locked', !canChallenge);

        let gateHint = '';
        if (boss.unlocksTier !== 'endgame' && boss.unlocksTier >= 3 && !canChallenge) {
          const prevTier = (boss.unlocksTier - 1) as 2 | 3;
          const prevTierOwned = GNOSE_UPGRADES.filter(
            (u) => u.tier === prevTier && gs.hasGnoseUpgrade(u.id)
          ).length;
          gateHint = ` [Requer Tier ${prevTier === 2 ? 'II' : 'III'}: ${prevTierOwned}/2 nós]`;
        }

        const label = boss.unlocksTier === 'endgame'
          ? `Desafiar ${boss.name} — Poder: ×${breakdown.totalResourceMultiplier.toFixed(2)} (-${(breakdown.passiveHpFractionPerSec * 100).toFixed(1)}%/s · ${etaSec})`
          : `Desafiar ${boss.name} (${boss.mythology})${gateHint} — Poder: ×${breakdown.totalResourceMultiplier.toFixed(2)} (-${(breakdown.passiveHpFractionPerSec * 100).toFixed(1)}%/s · ${etaSec})`;
        const seal = btn.closest('.gnose-tier-seal');
        this.setText(btn.querySelector('.gnose-guardian-label'), seal ? `Desafiar ${boss.name}` : label);
        if (seal) {
          this.setText(seal.querySelector('.gnose-guardian-requirement'), gateHint.trim() || 'Vença o Guardião para revelar os upgrades.');
          this.setText(seal.querySelector('.gnose-guardian-power'), `Poder: ×${breakdown.totalResourceMultiplier.toFixed(2)} · -${(breakdown.passiveHpFractionPerSec * 100).toFixed(1)}%/s · ${etaSec}`);
        }
      });

      const endgameLockHint = this.treeContainerEl.querySelector<HTMLElement>('#gnose-endgame-lock-hint');
      if (endgameLockHint) {
        const totalUnlockedNodes = GNOSE_UPGRADES.filter((u) => gs.hasGnoseUpgrade(u.id)).length;
        const breakdown = gs.getBossCombatBreakdown('boss_tiamat');
        const etaSec = Number.isFinite(breakdown.estimatedPassiveVictorySec)
          ? `~${Math.round(breakdown.estimatedPassiveVictorySec)}s`
          : '∞';
        this.setText(endgameLockHint.querySelector('.gnose-endgame-label'), `Assimile a Árvore da Gnose (${totalUnlockedNodes}/${GNOSE_UPGRADES.length}) • Poder Atual: ×${breakdown.totalResourceMultiplier.toFixed(2)} (-${(breakdown.passiveHpFractionPerSec * 100).toFixed(1)}%/s · ${etaSec})`);
      }
    }
  }

  private setText(element: Element | null, text: string): void {
    if (element && element.textContent !== text) element.textContent = text;
  }

  private setDisplay(element: HTMLElement, display: string): void {
    if (element.style.display !== display) element.style.display = display;
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
