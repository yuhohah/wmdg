import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { GNOSE_UPGRADES, GNOSE_TIER_LABELS, GNOSE_MIN_FAITH_REQ } from '../../config/gnose.js';
import { GNOSE_BOSSES } from '../../config/bosses.js';
import { calculateFaithForNextGnose, formatNumber } from '../../systems/calculations.js';
import { cultDialog } from '../../ui/CultDialog.js';
import { BossBattleModal, type BattleCameraTarget } from './BossBattleModal.js';
import type { BossCombatBreakdown, GnoseUpgrade } from '../../types.js';
import { icon, iconOrText } from '../../ui/icons.js';

export interface GnoseTabOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  notifications: NotificationManager;
  spawnFloatingText: (x: number, y: number, text: string, small?: boolean) => void;
  onGnoseReset?: () => void;
  onUpgradePurchased?: (upg: GnoseUpgrade) => void;
  onBossDefeated?: () => void;
  onBattleCamera?: (target: BattleCameraTarget, elapsedSec: number) => void;
}

function joinList(items: string[]): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

export function ascensionHint(faith: number, gainExponent: number): string {
  const current = `(você tem ${formatNumber(faith)})`;
  return faith < GNOSE_MIN_FAITH_REQ
    ? `Ascensão com ${formatNumber(GNOSE_MIN_FAITH_REQ)} de Fé ${current}`
    : `Próxima Gnose com ${formatNumber(calculateFaithForNextGnose(faith, gainExponent))} de Fé ${current}`;
}

export function readinessLine(breakdown: BossCombatBreakdown): string {
  const pct = Math.round(breakdown.cultReadiness * 100);
  const status = !breakdown.canDamageBoss
    ? 'você ainda não causa dano.'
    : !breakdown.canWithstandBoss
      ? 'um golpe não aparado destrói a Esfera.'
      : 'culto preparado.';
  const weak = breakdown.weakPillars.slice(0, 3).map((p) => p.label);
  return `Prontidão ${pct}%: ${status}${weak.length ? `\nFortaleça: ${joinList(weak)}.` : ''}`;
}

export function guardianRequirement(tier: number, canChallenge: boolean, previousTierOwned: number): string {
  if (canChallenge) return 'Vença para liberar estes nós.';
  return `Assimile 2 nós do Tier ${tier === 3 ? 'II' : 'III'} (${previousTierOwned}/2)`;
}

export function ascensionSummary(gs: GameStateManager): string {
  const keepRelics = gs.hasGnoseUpgrade('gn_keep_relics');
  const keepEncarnacao = gs.hasGnoseUpgrade('gn_memoria_selos');
  const lost = ['Fé', 'Fiéis', 'Fervor', 'Ritos', 'Avatar', 'Fragmentos', ...(keepRelics ? [] : ['Relíquias']), 'Selos'];
  const kept = [
    'Gnose', 'nós da Árvore', 'Guardiões derrotados', 'conquistas',
    ...(keepRelics ? ['níveis de Relíquias'] : []),
    ...(keepEncarnacao ? ['Selo da Encarnação'] : []),
  ];
  return `Seu culto recomeça do início e você recebe +${formatNumber(gs.getGnoseToGet())} Gnose.\n\nVocê perde: ${joinList(lost)}.\nVocê mantém: ${joinList(kept)}.`;
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
  private gnosePassiveMultValEl: HTMLElement | null = null;

  private confirmToggleEl: HTMLInputElement | null = null;
  private treeContainerEl: HTMLElement | null = null;

  constructor(options: GnoseTabOptions) {
    this.options = options;
    this.bossBattleModal = new BossBattleModal({
      gameState: options.gameState,
      audio: options.audio,
      notifications: options.notifications,
      spawnFloatingText: options.spawnFloatingText,
      onCameraFrame: options.onBattleCamera,
      onBattleEnded: (_boss, victory) => {
        this.options.onUpgradePurchased?.(GNOSE_UPGRADES[0]);
        if (victory) this.options.onBossDefeated?.();
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
    this.gnosePassiveMultValEl = document.getElementById('gnose-passive-mult-val');

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

  private previousTierOwned(tier: number): number {
    return GNOSE_UPGRADES.filter((u) => u.tier === tier - 1 && this.options.gameState.hasGnoseUpgrade(u.id)).length;
  }

  public async handleResetClick(): Promise<void> {
    const toGet = this.options.gameState.getGnoseToGet();
    if (toGet <= 0) {
      this.options.audio.playTone(180, 'sawtooth', 0.1);
      return;
    }

    if (this.options.gameState.confirmGnoseReset) {
      const confirmed = await cultDialog(
        'Ascensão Gnóstica',
        () => ascensionSummary(this.options.gameState),
        'Ascender',
        'Cancelar'
      );
      if (!confirmed) return;
      // Only the first Ascension needs the warning; the toggle can turn it back on.
      if (this.options.gameState.gnoseResets === 0) this.options.gameState.confirmGnoseReset = false;
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
          if (isTierOpen) {
            const bestTime = gs.getBossBestTimeSec(guardian.id);
            const bestTimeTag = typeof bestTime === 'number' ? ` • Recorde: ${bestTime.toFixed(1)}s` : '';
            guardianBadgeHtml = `
              <span class="gnose-guardian-badge defeated">
                ${iconOrText(guardian.symbol)} ${guardian.name}: SUBJUGADO (×${formatNumber(guardian.faithFervorMult)} Fé/Fervor${bestTimeTag})
              </span>
              <button type="button" class="btn-rematch-guardian" data-boss-id="${guardian.id}" title="Relembrar duelo contra ${guardian.name} sem risco de maldição">
                ⚔ Relembrar Duelo
              </button>
            `;
          } else {
            const readiness = canChallenge ? readinessLine(gs.getBossCombatBreakdown(guardian.id)) : '';
            guardianSealHtml = `
              <div class="gnose-tier-seal" role="group" aria-label="Tier bloqueado por ${guardian.name}">
                <span class="gnose-seal-chain gnose-seal-chain-left" aria-hidden="true"></span>
                <span class="gnose-seal-chain gnose-seal-chain-right" aria-hidden="true"></span>
                <div class="gnose-tier-seal-content">
                  <span class="gnose-tier-padlock" aria-hidden="true">${icon('lock')}</span>
                  <span class="gnose-guardian-requirement">${guardianRequirement(tier, canChallenge, this.previousTierOwned(tier))}</span>
                  <button type="button" class="btn-challenge-guardian ${canChallenge ? 'ready' : 'locked'}" data-boss-id="${guardian.id}" ${canChallenge ? '' : 'disabled'}>
                    ${icon('swords')} <span class="gnose-guardian-label">Desafiar ${guardian.name}</span>
                  </button>
                  <span class="gnose-guardian-readiness">${readiness}</span>
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

      const rematchBtn = tierHeader.querySelector<HTMLButtonElement>('.btn-rematch-guardian');
      rematchBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const bossId = rematchBtn.getAttribute('data-boss-id');
        if (bossId) this.bossBattleModal.openForBoss(bossId, { isRematch: true });
      });

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

        const statusBadge = isUnlocked
          ? `<span class="gnose-node-badge unlocked">ASSIMILADO</span>`
          : !isTierUnlocked
            ? `<span class="gnose-node-badge locked">${icon('lock')} ${formatNumber(upg.cost)} Gnose</span>`
            : !prereqsMet
              ? `<span class="gnose-node-badge locked">${icon('lock')} ${formatNumber(upg.cost)} Gnose</span>`
              : `<span class="gnose-node-badge cost">${formatNumber(upg.cost)} Gnose</span>`;

        nodeEl.innerHTML = `
          <div class="gnose-node-body">
            <p class="gnose-node-title">${upg.name}</p>
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
      const bestTiamatSec = gs.getBossBestTimeSec(tiamat.id);
      const bestTiamatTag = typeof bestTiamatSec === 'number' ? ` • Recorde: ${bestTiamatSec.toFixed(1)}s` : '';
      const readiness = canChallengeTiamat ? readinessLine(gs.getBossCombatBreakdown(tiamat.id)) : '';

      const endgameBar = document.createElement('div');
      endgameBar.className = `gnose-endgame-boss-bar ${isTiamatDefeated ? 'defeated' : canChallengeTiamat ? 'ready' : 'locked'}`;
      endgameBar.id = 'gnose-endgame-boss-bar';

      const actionHtml = isTiamatDefeated
        ? `<span class="gnose-guardian-badge defeated">${icon('crown')} CREPÚSCULO DOS DEUSES CONCLUÍDO (×10 Fé & Fervor${bestTiamatTag})</span>
           <button type="button" id="btn-rematch-tiamat" class="btn-rematch-guardian" data-boss-id="${tiamat.id}">⚔ Relembrar Duelo</button>`
        : canChallengeTiamat
          ? `<button type="button" id="btn-challenge-tiamat" class="btn-challenge-guardian endgame-ready" data-boss-id="${tiamat.id}">${iconOrText(tiamat.symbol)} <span class="gnose-guardian-label">Desafiar ${tiamat.name}</span></button>`
          : `<span class="gnose-endgame-lock-hint" id="gnose-endgame-lock-hint">${icon('lock')} <span class="gnose-endgame-label">Assimile todos os nós (${totalUnlockedNodes}/${GNOSE_UPGRADES.length})</span></span>`;

      endgameBar.innerHTML = `
        <div class="gnose-endgame-info">
          <span class="gnose-endgame-title">${iconOrText(tiamat.symbol)} APOTEOSE FINAL: ${tiamat.name.toUpperCase()}</span>
          ${isTiamatDefeated ? '' : `<span class="gnose-endgame-desc">Vença para multiplicar toda a Fé e o Fervor por ${formatNumber(tiamat.faithFervorMult)}×.</span>`}
          <span class="gnose-guardian-readiness" id="gnose-endgame-readiness">${readiness}</span>
        </div>
        <div class="gnose-endgame-action">
          ${actionHtml}
        </div>
      `;

      const tiamatBtn = endgameBar.querySelector<HTMLButtonElement>('#btn-challenge-tiamat');
      tiamatBtn?.addEventListener('click', () => {
        this.bossBattleModal.openForBoss(tiamat.id);
      });
      const tiamatRematchBtn = endgameBar.querySelector<HTMLButtonElement>('#btn-rematch-tiamat');
      tiamatRematchBtn?.addEventListener('click', () => {
        this.bossBattleModal.openForBoss(tiamat.id, { isRematch: true });
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
      this.setText(this.gnoseReqHintEl, ascensionHint(gs.faithPoints, gs.getGnoseGainExponent()));
    }

    if (this.btnGnoseResetEl) {
      if (this.btnGnoseResetEl.disabled !== (toGet <= 0)) this.btnGnoseResetEl.disabled = toGet <= 0;
    }

    if (this.gnoseBalanceValEl) {
      this.setText(this.gnoseBalanceValEl, formatNumber(gs.gnosePoints));
    }
    if (this.gnosePassiveMultValEl) {
      this.setText(this.gnosePassiveMultValEl, `×${formatNumber(gs.getTotalGnosePassiveMultiplier())}`);
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
        if (btn.disabled !== !canChallenge) btn.disabled = !canChallenge;
        if (btn.classList.contains('ready') !== canChallenge) btn.classList.toggle('ready', canChallenge);
        if (btn.classList.contains('locked') === canChallenge) btn.classList.toggle('locked', !canChallenge);

        const seal = btn.closest('.gnose-tier-seal');
        if (seal && boss.unlocksTier !== 'endgame') {
          this.setText(seal.querySelector('.gnose-guardian-requirement'), guardianRequirement(boss.unlocksTier, canChallenge, this.previousTierOwned(boss.unlocksTier)));
          this.setText(seal.querySelector('.gnose-guardian-readiness'), canChallenge ? readinessLine(gs.getBossCombatBreakdown(bossId)) : '');
        }
      });

      const endgameLockHint = this.treeContainerEl.querySelector<HTMLElement>('#gnose-endgame-lock-hint');
      if (endgameLockHint) {
        const totalUnlockedNodes = GNOSE_UPGRADES.filter((u) => gs.hasGnoseUpgrade(u.id)).length;
        this.setText(endgameLockHint.querySelector('.gnose-endgame-label'), `Assimile todos os nós (${totalUnlockedNodes}/${GNOSE_UPGRADES.length})`);
      }

      const endgameReadiness = this.treeContainerEl.querySelector<HTMLElement>('#gnose-endgame-readiness');
      if (endgameReadiness) {
        this.setText(endgameReadiness, gs.canChallengeBoss('boss_tiamat') ? readinessLine(gs.getBossCombatBreakdown('boss_tiamat')) : '');
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
