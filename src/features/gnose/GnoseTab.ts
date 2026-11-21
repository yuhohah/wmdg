import { GameStateManager } from '../../core/GameState.js';
import { events, GameEvents } from '../../core/EventBus.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { GNOSE_UPGRADES, GNOSE_TIER_LABELS, GNOSE_MIN_FAITH_REQ } from '../../config/gnose.js';
import { GNOSE_BOSSES } from '../../config/bosses.js';
import { calculateFaithForNextGnose, formatNumber } from '../../systems/calculations.js';
import { formatFixed } from '../../systems/numberFormat.js';
import { cultDialog } from '../../ui/CultDialog.js';
import { BossBattleModal, type BattleCameraTarget } from './BossBattleModal.js';
import type { BossCombatBreakdown, GnoseUpgrade } from '../../types.js';
import { icon, iconOrText } from '../../ui/icons.js';
import { setHudSectionVisibility, setText } from '../../ui/dom.js';

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

export type BossReadinessTier = 'blocked' | 'hard' | 'ready';

export function bossReadinessTier(breakdown: BossCombatBreakdown): BossReadinessTier {
  if (!breakdown.canDamageBoss) return 'blocked';
  if (!breakdown.canWithstandBoss) return 'hard';
  return 'ready';
}

export function bossReadinessBadgeText(breakdown: BossCombatBreakdown): string {
  const pct = Math.round(breakdown.cultReadiness * 100);
  const tier = bossReadinessTier(breakdown);
  if (tier === 'blocked') return `${pct}% · Sem dano`;
  if (tier === 'hard') return `${pct}% · Muito difícil`;
  return `${pct}% · Preparado`;
}

export function readinessLine(breakdown: BossCombatBreakdown): string {
  const pct = Math.round(breakdown.cultReadiness * 100);
  const tier = bossReadinessTier(breakdown);
  const status = tier === 'blocked'
    ? 'Sem dano — seus ataques ainda não ferem o Guardião (mínimo 60%).'
    : tier === 'hard'
      ? 'Muito difícil — qualquer golpe não aparado destrói a Esfera (80%+ recomendado).'
      : 'Preparado — seu culto resiste aos golpes do Guardião.';
  return `Prontidão ${pct}%: ${status}\nReferência de 100%: ${formatNumber(breakdown.readinessGnose)} Gnose. Gastar Gnose não reduz a prontidão.`;
}

export function guardianRequirement(tier: number, canChallenge: boolean, previousTierOwned: number): string {
  if (tier === 1 && !canChallenge) return 'Abra o Selo da Gnose para desafiar Anúbis.';
  if (canChallenge) return 'Vença para liberar estes nós.';
  const previousTier = tier - 1;
  const label = previousTier === 1 ? 'I' : previousTier === 2 ? 'II' : 'III';
  return `Assimile 1 nó do Tier ${label} (${Math.min(1, previousTierOwned)}/1)`;
}

export function ascensionSummary(gs: GameStateManager): string {
  const keepRelics = gs.hasGnoseUpgrade('gn_keep_relics');
  const keepEncarnacao = gs.hasGnoseUpgrade('gn_memoria_selos');
  const lost = ['Fé', 'Fiéis', 'Fervor', 'Ritos', 'Avatar', 'Fragmentos', ...(keepRelics ? [`${formatNumber(100 - gs.getEternalRelicRetention() * 100)}% dos níveis de Cornucópia e Tocha`] : ['Relíquias']), 'Selos'];
  const kept = [
    'Gnose', 'nós da Árvore', 'Guardiões derrotados', 'conquistas',
    ...(keepRelics ? [`Relíquias com limite e ${formatNumber(gs.getEternalRelicRetention() * 100)}% dos níveis de Cornucópia e Tocha (arredondados para baixo)`] : []),
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
  private gnoseProductionHintEl: HTMLElement | null = null;

  private confirmToggleEl: HTMLInputElement | null = null;
  private skipProcessionToggleEl: HTMLInputElement | null = null;
  private pendingChallengeDialog = false;
  private treeContainerEl: HTMLElement | null = null;
  private lastRenderedCurseSig = '';
  private nodeEls = new Map<string, HTMLButtonElement>();
  private sealRefs: Array<{
    boss: (typeof GNOSE_BOSSES)[number];
    btn: HTMLButtonElement;
    pillEl: HTMLElement | null;
    reqEl: HTMLElement | null;
    readinessEl: HTMLElement | null;
  }> = [];

  constructor(options: GnoseTabOptions) {
    this.options = options;
    this.bossBattleModal = new BossBattleModal({
      gameState: options.gameState,
      audio: options.audio,
      notifications: options.notifications,
      spawnFloatingText: options.spawnFloatingText,
      onCameraFrame: options.onBattleCamera,
      onBattleEnded: (_boss, victory) => {
        this.renderTree();
        this.updateUI();
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
    this.gnoseProductionHintEl = document.getElementById('gnose-production-hint');

    this.confirmToggleEl = document.getElementById('gnose-confirm-toggle') as HTMLInputElement | null;
    this.skipProcessionToggleEl = document.getElementById('gnose-skip-procession-toggle') as HTMLInputElement | null;
    this.treeContainerEl = document.getElementById('gnose-upgrades-tree');
  }

  private bindEvents(): void {
    this.btnGnoseResetEl?.addEventListener('click', (e) => {
      if (!e.isTrusted) return;
      void this.handleResetClick();
    });

    this.confirmToggleEl?.addEventListener('change', () => {
      this.options.gameState.confirmGnoseReset = !!this.confirmToggleEl?.checked;
    });

    this.skipProcessionToggleEl?.addEventListener('change', () => {
      this.options.gameState.skipBossProcession = !!this.skipProcessionToggleEl?.checked;
      events.emit(GameEvents.STATE_CHANGED);
    });
  }

  private async challengeBoss(bossId: string, options?: { isRematch?: boolean }): Promise<void> {
    if (this.pendingChallengeDialog) return;
    const gs = this.options.gameState;
    const boss = GNOSE_BOSSES.find((b) => b.id === bossId);
    const breakdown = gs.getBossCombatBreakdown(bossId);

    if (boss && !breakdown.canWithstandBoss) {
      this.pendingChallengeDialog = true;
      try {
        const pct = Math.round(breakdown.cultReadiness * 100);
        const title = !breakdown.canDamageBoss
          ? `Aviso: Prontidão insuficiente (${pct}%)`
          : `Aviso: Duelo Muito Difícil (${pct}%)`;
        const message = !breakdown.canDamageBoss
          ? `Sua prontidão contra ${boss.name} é de ${pct}% (mínimo de 60% para causar dano).\n\nNesta condição, seus ataques não causarão dano ao Guardião e qualquer golpe não aparado destruirá a Esfera instantaneamente.\n\nAscenda para acumular mais Gnose total (referência de 100%: ${formatNumber(breakdown.readinessGnose)} Gnose) antes de lutar.`
          : `Sua prontidão contra ${boss.name} é de ${pct}% — abaixo dos 80% recomendados.\n\nÉ possível vencer, mas o desafio é MUITO DIFÍCIL: qualquer golpe não aparado destruirá a Esfera instantaneamente e você causará menos dano.\n\nPara uma luta mais segura, ascenda para acumular mais Gnose total (referência de 100%: ${formatNumber(breakdown.readinessGnose)} Gnose).`;
        const confirmLabel = !breakdown.canDamageBoss ? 'Entrar mesmo assim' : 'Desafiar mesmo assim';
        const confirmed = await cultDialog(title, message, confirmLabel, 'Voltar');
        if (!confirmed) return;
      } finally {
        this.pendingChallengeDialog = false;
      }
    }

    this.bossBattleModal.openForBoss(bossId, options);
  }

  private previousTierOwned(tier: number): number {
    let count = 0;
    const prevTier = tier - 1;
    for (let i = 0; i < GNOSE_UPGRADES.length; i++) {
      const u = GNOSE_UPGRADES[i];
      if (u.tier === prevTier && this.options.gameState.hasGnoseUpgrade(u.id)) count++;
    }
    return count;
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
      const guardian = gs.getBossForTier(upg.tier);
      if (guardian && gs.canChallengeBoss(guardian.id)) {
        void this.challengeBoss(guardian.id);
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
    this.nodeEls.clear();
    this.sealRefs.length = 0;

    const gs = this.options.gameState;
    const curseStacks = gs.getBossCurseStacks();
    const cleanseBoss = gs.getBossCurseCleanseBoss();
    this.lastRenderedCurseSig = `${curseStacks}:${gs.bossCurseBossId ?? ''}`;

    // Active curse banner (stacked when losing to Hades, Odin, Primordial Chaos, or Demiurge)
    const curseBanner = document.createElement('div');
    curseBanner.id = 'gnose-curse-banner';
    curseBanner.className = 'gnose-curse-banner';
    curseBanner.style.display = curseStacks > 0 ? 'flex' : 'none';
    if (curseStacks > 0) {
      const mods = gs.getBossCurseModifiers('boss_cronos');
      const dmgRedPct = Math.round(mods.damageReduction * 100);
      const extraDmgPct = Math.round(mods.extraDamageRatio * 100);
      const hitkillNote = curseStacks >= 5 ? ' · HITKILL ao errar aparo' : '';
      const purifyHtml = cleanseBoss
        ? `<button type="button" class="btn-purify-curse" data-cleanse-boss-id="${cleanseBoss.id}">⚔ Purificar contra ${cleanseBoss.name}</button>`
        : `<span class="gnose-curse-hint">Derrote o chefe anterior para purificar</span>`;
      curseBanner.innerHTML = `
        <span class="gnose-curse-summary">${icon('warning')} <strong>Maldição dos Guardiões (${curseStacks}/5):</strong> −${dmgRedPct}% dano aos chefes, +${extraDmgPct}% dano sofrido e <em>Riposte Gnóstico</em> ao aparar${hitkillNote}</span>
        ${purifyHtml}
      `;
      const purifyBtn = curseBanner.querySelector<HTMLButtonElement>('.btn-purify-curse');
      purifyBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!e.isTrusted) return;
        const bossId = purifyBtn.getAttribute('data-cleanse-boss-id');
        if (bossId) this.bossBattleModal.openForBoss(bossId, { isRematch: true });
      });
    }
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
      const guardian = gs.getBossForTier(tier);
      if (guardian) {
        const isTierOpen = gs.isGnoseTierUnlocked(tier);
        const canChallenge = gs.canChallengeBoss(guardian.id);
        if (isTierOpen) {
          const bestTime = gs.getBossBestTimeSec(guardian.id);
          const bestTimeTag = typeof bestTime === 'number' ? ` • Recorde: ${formatFixed(bestTime, 1)}s` : '';
          const isCleanseTarget = cleanseBoss?.id === guardian.id && curseStacks > 0;
          const rematchLabel = isCleanseTarget
            ? `⚔ Purificar Maldição (${curseStacks}/5)`
            : '⚔ Relembrar Duelo';
          const rematchTitle = isCleanseTarget
            ? `Derrote ${guardian.name} para remover todos os acúmulos da Maldição`
            : guardian.id === 'boss_anubis'
              ? `Relembrar duelo contra ${guardian.name} sem risco de maldição`
              : `Relembrar duelo contra ${guardian.name} (derrotas acumulam Maldição até 5/5)`;
          guardianBadgeHtml = `
            <span class="gnose-guardian-badge defeated">
              ${iconOrText(guardian.symbol)} ${guardian.name}: SUBJUGADO (×${formatNumber(guardian.faithFervorMult)} Fé/Fervor${bestTimeTag})
            </span>
            <button type="button" class="btn-rematch-guardian${isCleanseTarget ? ' is-cleanse-target' : ''}" data-boss-id="${guardian.id}" title="${rematchTitle}">
              ${rematchLabel}
            </button>
          `;
        } else {
          const breakdown = canChallenge ? gs.getBossCombatBreakdown(guardian.id) : null;
          const tierState = breakdown ? bossReadinessTier(breakdown) : '';
          const readiness = breakdown ? readinessLine(breakdown) : '';
          const badgeText = breakdown ? bossReadinessBadgeText(breakdown) : '';
          const readinessClass = tierState ? ` readiness-${tierState}` : '';
          const readinessAttr = tierState ? ` data-readiness="${tierState}"` : '';
          guardianSealHtml = `
            <div class="gnose-tier-seal" role="group" aria-label="Tier bloqueado por ${guardian.name}">
              <span class="gnose-seal-chain gnose-seal-chain-left" aria-hidden="true"></span>
              <span class="gnose-seal-chain gnose-seal-chain-right" aria-hidden="true"></span>
              <div class="gnose-tier-seal-content">
                <span class="gnose-tier-padlock" aria-hidden="true">${icon('lock')}</span>
                <span class="gnose-guardian-requirement">${guardianRequirement(tier, canChallenge, this.previousTierOwned(tier))}</span>
                <button type="button" class="btn-challenge-guardian ${canChallenge ? 'ready' : 'locked'}${readinessClass}" data-boss-id="${guardian.id}"${readinessAttr} ${canChallenge ? '' : 'disabled'}>
                  <span class="gnose-guardian-btn-main">${icon('swords')} <span class="gnose-guardian-label">Desafiar ${guardian.name}</span></span>
                  <span class="gnose-readiness-pill"${badgeText ? '' : ' hidden'}>${badgeText}</span>
                </button>
                <span class="gnose-guardian-readiness"${readinessAttr}>${readiness}</span>
              </div>
            </div>
          `;
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
        if (!e.isTrusted) return;
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
        const canAfford = gs.gnosePoints >= upg.cost;

        const stateClass = isUnlocked
          ? 'gnose-node-unlocked'
          : !isTierUnlocked
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

        nodeEl.addEventListener('click', (e) => {
          if (!e.isTrusted) return;
          this.buyUpgrade(upg);
        });

        this.nodeEls.set(upg.id, nodeEl);
        tierGrid.appendChild(nodeEl);
      });

      const tierContent = document.createElement('div');
      tierContent.className = 'gnose-tier-content';
      tierContent.appendChild(tierGrid);
      if (guardianSealHtml && guardian) {
        tierContent.insertAdjacentHTML('beforeend', guardianSealHtml);
        const challengeBtn = tierContent.querySelector<HTMLButtonElement>('.btn-challenge-guardian');
        challengeBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!e.isTrusted) return;
          const bossId = challengeBtn.getAttribute('data-boss-id');
          if (bossId) void this.challengeBoss(bossId);
        });
        if (challengeBtn) {
          const seal = challengeBtn.closest('.gnose-tier-seal');
          this.sealRefs.push({
            boss: guardian,
            btn: challengeBtn,
            pillEl: challengeBtn.querySelector<HTMLElement>('.gnose-readiness-pill'),
            reqEl: seal?.querySelector<HTMLElement>('.gnose-guardian-requirement') ?? null,
            readinessEl: seal?.querySelector<HTMLElement>('.gnose-guardian-readiness') ?? null,
          });
        }
      }
      tierSection.appendChild(tierContent);
      this.treeContainerEl!.appendChild(tierSection);
    });

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
      this.setText(this.gnoseBalanceValEl, formatNumber(gs.totalGnoseEarned));
    }
    const multiplier = gs.getTotalGnosePassiveMultiplier();
    if (this.gnosePassiveMultValEl) {
      this.setText(this.gnosePassiveMultValEl, `×${formatNumber(multiplier)}`);
    }
    if (this.gnoseProductionHintEl) {
      this.setText(this.gnoseProductionHintEl, `A Gnose total obtida concede ×${formatNumber(multiplier)} (+${formatNumber((multiplier - 1) * 100)}%) à Fé por clique, Fé/s e Fervor/s. Gastar Gnose não reduz o bônus.`);
    }

    if (this.confirmToggleEl) {
      if (this.confirmToggleEl.checked !== (gs.confirmGnoseReset)) this.confirmToggleEl.checked = gs.confirmGnoseReset;
    }
    if (this.skipProcessionToggleEl) {
      if (this.skipProcessionToggleEl.checked !== gs.skipBossProcession) {
        this.skipProcessionToggleEl.checked = gs.skipBossProcession;
      }
    }

    // Re-render curse banner and purify actions whenever curse state changes externally (e.g. Demiurge loss or save load)
    const curseSig = `${gs.getBossCurseStacks()}:${gs.bossCurseBossId ?? ''}`;
    if (this.treeContainerEl && curseSig !== this.lastRenderedCurseSig) {
      this.renderTree();
    }

    this.updateNodeStates();
  }

  public updateNodeStates(): void {
    const gs = this.options.gameState;
    const gnosePoints = gs.gnosePoints;
    const tierUnlocked1 = gs.isGnoseTierUnlocked(1);
    const tierUnlocked2 = gs.isGnoseTierUnlocked(2);
    const tierUnlocked3 = gs.isGnoseTierUnlocked(3);
    const tierUnlocked4 = gs.isGnoseTierUnlocked(4);

    for (let i = 0; i < GNOSE_UPGRADES.length; i++) {
      const upg = GNOSE_UPGRADES[i];
      const isTierUnlocked = upg.tier === 1 ? tierUnlocked1
        : upg.tier === 2 ? tierUnlocked2
        : upg.tier === 3 ? tierUnlocked3
        : tierUnlocked4;
      // Covered grids stay static until the victory callback rebuilds the tier.
      if (!isTierUnlocked) continue;
      const nodeEl = this.nodeEls.get(upg.id);
      if (!nodeEl) continue;

      const isUnlocked = gs.hasGnoseUpgrade(upg.id);
      const canAfford = gnosePoints >= upg.cost;
      const shouldDisable = isUnlocked || !canAfford;
      if (nodeEl.disabled !== shouldDisable) nodeEl.disabled = shouldDisable;

      const stateClass = isUnlocked
        ? 'gnose-node-unlocked'
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
    }

    // Dynamically update Guardian Boss challenge buttons & Endgame Boss bar as resources change
    for (let i = 0; i < this.sealRefs.length; i++) {
      const { boss, btn, pillEl, reqEl, readinessEl } = this.sealRefs[i];
      const canChallenge = gs.canChallengeBoss(boss.id);
      if (btn.disabled !== !canChallenge) btn.disabled = !canChallenge;
      if (btn.classList.contains('ready') !== canChallenge) btn.classList.toggle('ready', canChallenge);
      if (btn.classList.contains('locked') === canChallenge) btn.classList.toggle('locked', !canChallenge);

      const breakdown = canChallenge ? gs.getBossCombatBreakdown(boss.id) : null;
      const tierState = breakdown ? bossReadinessTier(breakdown) : '';
      const nextReadinessClass = tierState ? `readiness-${tierState}` : '';
      for (const cls of ['readiness-blocked', 'readiness-hard', 'readiness-ready']) {
        const shouldHave = cls === nextReadinessClass;
        if (btn.classList.contains(cls) !== shouldHave) btn.classList.toggle(cls, shouldHave);
      }
      if (tierState) {
        if (btn.dataset.readiness !== tierState) btn.dataset.readiness = tierState;
        if (readinessEl && readinessEl.dataset.readiness !== tierState) readinessEl.dataset.readiness = tierState;
      } else {
        if (btn.dataset.readiness) delete btn.dataset.readiness;
        if (readinessEl && readinessEl.dataset.readiness) delete readinessEl.dataset.readiness;
      }

      if (pillEl) {
        const badgeText = breakdown ? bossReadinessBadgeText(breakdown) : '';
        this.setText(pillEl, badgeText);
        if (pillEl.hidden !== !badgeText) pillEl.hidden = !badgeText;
      }

      this.setText(reqEl, guardianRequirement(boss.unlocksTier, canChallenge, this.previousTierOwned(boss.unlocksTier)));
      this.setText(readinessEl, breakdown ? readinessLine(breakdown) : '');
    }
  }

  private setText(element: Element | null, text: string): void {
    setText(element, text);
  }

  public setHudVisibility(unlocked: boolean): void {
    setHudSectionVisibility(this.hudDividerEl, this.hudItemEl, unlocked);
  }
}
