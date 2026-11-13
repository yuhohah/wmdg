import { ETERNAL_RELIC_IDS, ETERNAL_RELIC_COST_GROWTH, ETERNAL_RELIC_FIXED_LEVELS } from '../config/relics.js';
import type { GameStateManager } from '../core/GameState.js';
import { GNOSE_UPGRADES, GNOSE_FORMULAS, PROGRESSION_BALANCE, GNOSE_PASSIVE_FORMULA } from '../config/gnose.js';
import { INCARNATION_STAGES, BLESSING_SECONDS_PER_PRESS, BLESSING_MAX_SECONDS } from '../config/incarnation.js';
import {
  calculateCostDiscountMultiplier,
  calculateExtraRelicsPerSecond,
  calculateFaithForNextGnose,
  calculateIncarnationFollowerMultiplier,
  calculateMaxAffordableFollowers,
  calculateRelicFaithMultiplier,
  calculateTotalGnoseMultiplier,
  formatNumber,
} from './calculations.js';
import { getRelicUpgradeBulkCost, getRelicUpgradeCost } from './relicCosts.js';

export interface PurchaseFormulas { cost: string; bonus: string }

// Keep coefficients readable without changing the underlying purchase calculations.
const coefficient = (value: number) => formatNumber(value, 12);

function followerBonusFormula(game: GameStateManager, bulk: boolean): string {
  // Only the follower Rito and Gnose synergy depend on N. Collect the other live
  // production multipliers into one coefficient, without changing game state.
  const count = game.getTotalFollowersCount();
  const sampleCount = Math.max(1, count);
  const sampleProduction = count > 0 ? game.getFaithPerSecond() : game.getFollowerPurchaseFaithGain(1);
  const ritual = game.fervorUpgrades.find(upg => upg.id === 'fu_followers')!;
  const ritualEffect = game.getFervorUpgradeEffect(ritual, sampleCount);
  const synergyEffect = game.getGnoseFollowersSynergyMultiplier(sampleCount);
  const constant = sampleProduction / (sampleCount * ritualEffect * synergyEffect);

  const hasSynergy = game.hasGnoseUpgrade('gn_followers_syn') || game.hasGnoseUpgrade('gn_init_faith');
  const exponent = game.hasGnoseUpgrade('gn_followers_syn')
    ? game.hasGnoseUpgrade('gn_followers_cubic') ? 1.1 : PROGRESSION_BALANCE.congregationExponent
    : PROGRESSION_BALANCE.earlySynergyExponent;

  const follower = game.followers[0];
  const scale = game.getDevoteeBaseMultiplier();
  const discount = calculateCostDiscountMultiplier(game.achievements);
  const bulkCount = bulk && follower
    ? Math.max(1, calculateMaxAffordableFollowers(follower, game.faithPoints, discount, scale).count)
    : 1;
  const deltaGain = game.getFollowerPurchaseFaithGain(bulk ? bulkCount : 1);

  const lines = [
    `P(N) = N × M_fixos × Rito_Fiéis(N) × Sinergia_Gnose(N)`,
    `• M_fixos (Fervor, Avatar, Relíquias, Gnose, Conquistas) = ×${formatNumber(constant)}`,
    ritual.level > 0
      ? `• Rito_Fiéis(N) = 1 + (${ritual.level}^1,5 × N) / 50 (atual: ×${formatNumber(ritualEffect)})`
      : `• Rito_Fiéis(N) = 1 (Rito em nível 0)`,
    hasSynergy
      ? `• Sinergia_Gnose(N) = 1 + N^${coefficient(exponent)} (atual: ×${formatNumber(synergyEffect)})`
      : `• Sinergia_Gnose(N) = 1 (sem sinergia ativa)`,
    `ΔFé/s = P(Fiéis + ${bulk ? `n` : '1'}) − P(Fiéis) = +${formatNumber(deltaGain)} Fé/s`,
  ];
  return lines.join('\n');
}

const gnoseBonuses: Record<string, string> = {
  gn_init_faith: [
    '• Escala de custo dos Fiéis: escala′ = escala − 0,01 (1,10 → 1,09)',
    '• Sinergia dos Fiéis na Fé: M_sinergia = 1 + Fiéis^0,5',
    '• Fé inicial após Ascensão: Fé_inicial = 1.000 Fé',
  ].join('\n'),
  gn_memoria_selos: [
    '• Preserva o Selo da Encarnação ao ascender (Fervor_base = 1/s)',
    '• Libera compras em lote: Converter, Ritualizar (≤ 100) e Restaurar Máximo',
  ].join('\n'),
  gn_init_fervor: [
    `• Rito Produção de Fervor: M(L) = base^(L^0,6), base 2 → ${coefficient(GNOSE_FORMULAS.fervorProductionBase)}`,
    `• Escala de custo do Rito: escala′ = escala − ${coefficient(GNOSE_FORMULAS.ritualCostStep)} (1,80 → 1,75)`,
  ].join('\n'),
  gn_relic_gain: [
    `• Rito Ganho de Fragmentos: M(L) = base^(L^0,6), base 3 → ${coefficient(GNOSE_FORMULAS.relicProductionBase)}`,
    `• Escala de custo do Rito: escala′ = escala − ${coefficient(GNOSE_FORMULAS.relicCostStep)} (5,00 → 4,90)`,
  ].join('\n'),
  gn_automation: [
    '• Ciclo (1s): compra Fiéis automaticamente (até 10.000/s)',
    '• Desconta o custo normal: Fé′ = Fé − Σ Custo(Fiéis)',
  ].join('\n'),
  gn_seal_automation: [
    '• Ciclo (1s): rompe Selos fechados em ordem quando Fé ≥ Custo',
    '• Selo da Gnose abre ao atingir 1e15 Fé sem consumir saldo',
  ].join('\n'),
  gn_ritual_automation: [
    '• Ciclo (1s): compra Ritos por maior ganho relativo / custo',
    '• Limite: Δnível ≤ 50/rito/s; desconta Fervor′ = Fervor − Σ Custo_Rito',
  ].join('\n'),
  gn_relic_automation: [
    '• Ciclo (1s): prioriza Fênix e compra Relíquias por maior retorno / custo',
    '• Limite: Δnível ≤ 50/relíquia/s; desconta Fragmentos′ = Fragmentos − Σ Custo_Relíquia',
  ].join('\n'),
  gn_followers_syn: [
    `• Sinergia dos Fiéis na Fé: M_sinergia = 1 + Fiéis^${coefficient(PROGRESSION_BALANCE.congregationExponent)} (expoente 0,5 → 1)`,
  ].join('\n'),
  gn_bencao_eterna: [
    '• Bênção da Encarnação permanente: M_Bênção = ×2 Fé/s (mantém 60s ativos)',
  ].join('\n'),
  gn_keep_relics: [
    '• Preserva os níveis das Relíquias ao ascender',
    '• Limite de nível da Cornucópia e Tocha: 20 → ∞ (custo ×1,15^max(0, L − 19))',
  ].join('\n'),
  gn_followers_economy: [
    `• Escala de custo dos Fiéis: escala′ = escala − ${coefficient(GNOSE_FORMULAS.followerEconomyStep)} (1,09 → 1,075 antes de Hermes, piso 1,05)`,
  ].join('\n'),
  gn_followers_cubic: [
    '• Sinergia dos Fiéis na Fé: M_sinergia = 1 + Fiéis^1,1 (expoente 1 → 1,1)',
  ].join('\n'),
  gn_gnose_mult: [
    `• Ganho ao ascender: Gnose = ⌊(Fé / 1e15)^${coefficient(PROGRESSION_BALANCE.enlightenedExponent)}⌋ para Fé ≥ 1e15 (expoente 0,25 → 0,28)`,
  ].join('\n'),
  gn_relic_refinement: [
    `• Rito Ganho de Fragmentos: M(L) = base^(L^0,6), base 3,05 → ${coefficient(GNOSE_FORMULAS.refinedRelicProductionBase)}`,
    `• Escala de custo do Rito: escala′ = escala − ${coefficient(GNOSE_FORMULAS.refinedRelicCostStep)} (4,90 → 4,60)`,
  ].join('\n'),
  gn_fu1_boost: [
    `• Rito Produção de Fervor: M(L) = base^(L^0,6), base 2,05 → ${coefficient(GNOSE_FORMULAS.hermeticProductionBase)}`,
  ].join('\n'),
  gn_omniscience: [
    '• Auto-Fiéis e Auto-Ritos não consomem Fé/Fervor (exigem saldo ≥ Custo)',
    '• Auto-Transmutação: ΔFragmentos/s = +100% × Transmutação(Fé)',
  ].join('\n'),
  gn_apotheosis: [
    `• Escala de custo de todos os Ritos: escala′ = escala − ${coefficient(GNOSE_FORMULAS.ritualCostStep)}`,
    `• Custo do Avatar do Eclipse (Estágio 4): 1e25 → 1e20 Fé`,
    `• Avatar Solar (Estágio 5): C_Solar = ${formatNumber(PROGRESSION_BALANCE.solarCost)} Fé (não exige este nó)`,
  ].join('\n'),
  gn_empyrean_fire: [
    `• Rito Produção de Fervor: M(L) = base^(L^0,6), base 2,35 → ${coefficient(GNOSE_FORMULAS.empyreanProductionBase)}`,
    `• Escala de custo do Rito: escala′ = escala − ${coefficient(GNOSE_FORMULAS.empyreanRitualCostStep)} (1,70 → 1,60)`,
  ].join('\n'),
  gn_perfect_opus: [
    `• Rito Ganho de Fragmentos: M(L) = base^(L^0,6), base 3,40 → ${coefficient(GNOSE_FORMULAS.perfectRelicProductionBase)}`,
    `• Escala de custo do Rito: escala′ = escala − ${coefficient(GNOSE_FORMULAS.perfectRelicCostStep)} (4,55 → 4,15)`,
  ].join('\n'),
};

/** Returns only mathematical purchase information, using the live economy's coefficients. */
export function getPurchaseFormulas(game: GameStateManager, id: string, bulk = false): PurchaseFormulas | null {
  const follower = game.followers.find(item => item.id === id);
  if (follower) {
    const N = game.getTotalFollowersCount();
    const scale = follower.id === 'f_devotee' ? game.getDevoteeBaseMultiplier() : follower.costMultiplier;
    const discount = follower.id === 'f_devotee' ? calculateCostDiscountMultiplier(game.achievements) : 1;
    const single = discount < 1
      ? `max(1, ⌊⌊${formatNumber(follower.baseCost)} × (${coefficient(scale)})^N⌋ × ${coefficient(discount)}⌋)`
      : `max(1, ⌊${formatNumber(follower.baseCost)} × (${coefficient(scale)})^N⌋)`;
    const nextCost = game.getItemCost(follower);
    if (bulk) {
      const { count: maxCount, totalCost } = calculateMaxAffordableFollowers(follower, game.faithPoints, discount, scale);
      return {
        cost: [
          `C(n) = Σ[i=0…n−1] C(N + i) (n ≤ 10.000, C(n) ≤ Fé)`,
          `Unitário: C(N) = ${single} Fé`,
          `Atual (N = ${formatNumber(N)}, lote n = ${formatNumber(maxCount)}): ${formatNumber(totalCost)} Fé`,
        ].join('\n'),
        bonus: followerBonusFormula(game, true),
      };
    }
    return {
      cost: [
        `C(N) = ${single} Fé`,
        `Atual (N = ${formatNumber(N)} Fiéis, escala = ${coefficient(scale)}${discount < 1 ? `, desc. = ×${coefficient(discount)}` : ''}): ${formatNumber(nextCost)} Fé`,
      ].join('\n'),
      bonus: followerBonusFormula(game, false),
    };
  }

  const ritual = game.fervorUpgrades.find(upg => upg.id === id);
  if (ritual) {
    const L = ritual.level;
    const step = bulk ? Math.max(1, game.getMaxFervorUpgradeCount(ritual)) : 1;
    const nextL = L + step;
    const currentEff = game.getFervorUpgradeEffect(ritual);
    const nextEff = game.getFervorUpgradeEffect({ ...ritual, level: nextL });
    const base = coefficient(game.getFervorUpgradeEffect({ ...ritual, level: 1 }));
    const scale = game.getFervorUpgradeCostMultiplier(ritual);
    const single = `⌊${formatNumber(ritual.baseCost)} × (${coefficient(scale)})^nível⌋`;

    let totalCost = 0;
    for (let i = 0; i < step; i++) {
      totalCost += game.getFervorUpgradeCost({ ...ritual, level: L + i });
    }

    const transition = `Nível ${formatNumber(L)} → ${formatNumber(nextL)}: ×${formatNumber(currentEff)} → ×${formatNumber(nextEff)}`;
    const effects: Record<string, string> = {
      fu_prod: `M_Fervor/s(nível) = (${base})^(nível^0,6)\n${transition} Fervor/s`,
      fu_effect: [
        `M_efeito_Fervor(nível) = (1,25)^(nível^0,8)`,
        `Bônus na Fé = (2 × log10(pico_Fervor / 10 + 1) + 1) × M_efeito_Fervor`,
        transition,
      ].join('\n'),
      fu_click: `M_Fé/clique(nível) = 1 + 4 × nível^2,6\n${transition} Fé/clique`,
      fu_followers: [
        `M_Fé/s(nível) = 1 + (nível^1,5 × Fiéis) / 50`,
        `Com Fiéis = ${formatNumber(game.getTotalFollowersCount())} · ${transition} Fé/s`,
      ].join('\n'),
      fu_synergy: [
        `M_Fervor/s(nível) = 1 + (nível^1,5 × log10(Fé + 1)) / 5`,
        `Com Fé = ${formatNumber(Math.floor(game.faithPoints))} · ${transition} Fervor/s`,
      ].join('\n'),
      fu_relics: [
        `M_Transmutação(nível) = (${base})^(nível^0,6)`,
        `Fragmentos = ⌊log2(Fé + 1) × M_Transmutação(nível)⌋`,
        `${transition} Fragmentos`,
      ].join('\n'),
    };

    return {
      cost: bulk
        ? [
            `C(n) = Σ[i=0…n−1] C(nível + i) (n ≤ 100)`,
            `Unitário: C(nível) = ${single} Fervor`,
            `Atual (nível = ${formatNumber(L)}, +n = ${formatNumber(game.getMaxFervorUpgradeCount(ritual))}): ${formatNumber(totalCost)} Fervor`,
          ].join('\n')
        : [
            `C(nível) = ${single} Fervor`,
            `Atual (nível = ${formatNumber(L)} → ${formatNumber(L + 1)}, escala = ${coefficient(scale)}): ${formatNumber(totalCost)} Fervor`,
          ].join('\n'),
      bonus: effects[id],
    };
  }

  const relic = game.relicUpgrades.find(upg => upg.id === id);
  if (relic) {
    const L = relic.level;
    const maxLevel = game.getRelicMaxLevel(relic);
    const cap = Number.isFinite(maxLevel) ? String(maxLevel) : '∞';
    const isMax = L >= maxLevel;
    const availCount = game.getMaxRelicUpgradeCount(relic);
    const step = bulk ? Math.max(1, availCount) : 1;
    const nextL = isMax ? L : Math.min(maxLevel, L + step);
    const isEternal = ETERNAL_RELIC_IDS.includes(relic.id);
    const single = isEternal
      ? `${formatNumber(relic.cost)} × (${coefficient(ETERNAL_RELIC_COST_GROWTH)})^max(0, nível − ${ETERNAL_RELIC_FIXED_LEVELS - 1})`
      : formatNumber(relic.cost);
    const costNow = isMax ? 0 : (bulk ? getRelicUpgradeBulkCost(relic, step) : getRelicUpgradeCost(relic));

    const gnoseFollowerDisc = (game.hasGnoseUpgrade('gn_init_faith') ? GNOSE_FORMULAS.followerCostStep : 0)
      + (game.hasGnoseUpgrade('gn_followers_economy') ? GNOSE_FORMULAS.followerEconomyStep : 0);
    const scaleAt = (lvl: number) => Math.max(1.05, 1.10 - 0.005 * lvl - gnoseFollowerDisc);
    const peakRelics = Math.max(game.relicPoints, game.relicPeakThisRun);
    const draupnirRate = 0.05 * game.getRelicsToGet();

    const relicBonuses: Record<string, string> = {
      relic_cornucopia: [
        `M_Fé/s(nível) = 1 + 0,20 × nível (+20% por nível)`,
        `Nível ${formatNumber(L)}${isMax ? '' : ` → ${formatNumber(nextL)}`}: ×${formatNumber(1 + 0.2 * L)}${isMax ? '' : ` → ×${formatNumber(1 + 0.2 * nextL)}`} Fé/s`,
      ].join('\n'),
      relic_torch: [
        `M_Fervor/s(nível) = 1 + 0,20 × nível (+20% por nível)`,
        `Nível ${formatNumber(L)}${isMax ? '' : ` → ${formatNumber(nextL)}`}: ×${formatNumber(1 + 0.2 * L)}${isMax ? '' : ` → ×${formatNumber(1 + 0.2 * nextL)}`} Fervor/s`,
      ].join('\n'),
      relic_phoenix: [
        `M_Fervor/s = ×1,5 (nível 1)`,
        `Desbloqueia o Rito "Ganho de Fragmentos" (Rito_Fragmentos = 1)`,
      ].join('\n'),
      relic_caduceus: [
        `escala_Fiéis(nível) = max(1,05; 1,10 − 0,005 × nível − descontos_Gnose)`,
        `Nível ${L}${isMax ? '' : ` → ${nextL}`}: escala ${coefficient(scaleAt(L))}${isMax ? '' : ` → ${coefficient(scaleAt(nextL))}`} (piso 1,05)`,
      ].join('\n'),
      relic_draupnir: [
        `ΔFragmentos/s = 0,05 × Transmutação(Fé)`,
        `Atual: +${formatNumber(draupnirRate)} Fragmentos/s (sem consumir Fé)`,
      ].join('\n'),
      relic_ark: [
        `M_Fé/s(nível) = (log10(pico_Fragmentos + 1) + 1)^(1,2 × nível)`,
        `Com pico = ${formatNumber(Math.floor(peakRelics))} · Nível ${L}${isMax ? '' : ` → ${nextL}`}: ×${formatNumber(calculateRelicFaithMultiplier(peakRelics, L))}${isMax ? '' : ` → ×${formatNumber(calculateRelicFaithMultiplier(peakRelics, nextL))}`} Fé/s`,
      ].join('\n'),
    };

    return {
      cost: bulk
        ? [
            `C(n) = Σ[i=0…n−1] C(nível + i) (n ≤ ${cap} − nível)`,
            `Unitário: C(nível) = ${single} Fragmentos`,
            isMax
              ? `Atual (nível ${formatNumber(L)} / ${cap}): Nível máximo atingido`
              : `Atual (nível = ${formatNumber(L)}, +n = ${formatNumber(availCount)}): ${formatNumber(costNow)} Fragmentos`,
          ].join('\n')
        : [
            `C(nível) = ${single} Fragmentos (nível < ${cap})`,
            isMax
              ? `Atual (nível ${formatNumber(L)} / ${cap}): Nível máximo atingido`
              : `Atual (nível ${formatNumber(L)} → ${formatNumber(L + 1)} de ${cap}): ${formatNumber(costNow)} Fragmentos`,
          ].join('\n'),
      bonus: relicBonuses[id],
    };
  }

  const gnose = GNOSE_UPGRADES.find(upg => upg.id === id);
  if (gnose) {
    const owned = game.hasGnoseUpgrade(gnose.id);
    const productionMultiplier = game.getTotalGnosePassiveMultiplier();
    const productionPercent = (productionMultiplier - 1) * 100;
    return {
      cost: `C = ${formatNumber(gnose.cost)} Gnose${owned ? ' (já assimilado)' : ''}`,
      bonus: [
        `Bônus atual por Gnose total: ×${formatNumber(productionMultiplier)} (+${formatNumber(productionPercent)}%) na Fé por clique, Fé/s e Fervor/s`,
        `M = ${GNOSE_PASSIVE_FORMULA}; Gnose total obtida: ${formatNumber(game.totalGnoseEarned)}`,
        'Gastar Gnose não reduz este bônus.',
        gnoseBonuses[id],
      ].join('\n'),
    };
  }

  const seal = game.unlocks.find(upg => upg.id === id);
  if (seal) {
    const exp = coefficient(game.getGnoseGainExponent());
    const effects: Record<string, string> = {
      unlock_incarnation: [
        'Fervor_base/s = 1 Fervor/s',
        'M_Fervor na Fé = (2 × log10(pico_Fervor / 10 + 1) + 1) × Rito_Efeito',
        'M_Encarnação nos Fiéis = 1 + 1,5 × estágio × log10(1 + pico_Fervor / 150)',
      ].join('\n'),
      unlock_fervor_upgrades: [
        'Libera os 6 Ritos de Fervor (Ritos_Fervor = 1)',
        'Custo por Rito: C(nível) = ⌊base × escala^nível⌋ Fervor',
      ].join('\n'),
      unlock_relics: [
        'Fragmentos_Transmutação = ⌊log2(Fé + 1) × M_Transmutação⌋',
        'Fragmentos/s passivo = max(1, ⌊melhor_Transmutação / 10⌋)',
      ].join('\n'),
      unlock_gnose: [
        `Gnose ao ascender = ⌊(Fé / 1e15)^${exp}⌋ (para Fé ≥ 1e15)`,
        `M_Gnose passivo = ${GNOSE_PASSIVE_FORMULA}`,
      ].join('\n'),
    };
    return {
      cost: seal.id === 'unlock_gnose'
        ? 'C = 0 Fé (requer Fé ≥ 1e15; não consome sua Fé)'
        : `C = ${formatNumber(seal.cost)} ${seal.costCurrency === 'faith' ? 'Fé' : 'Fervor'}`,
      bonus: effects[id],
    };
  }

  if (id === 'incarnation') {
    const next = INCARNATION_STAGES.find(stage => stage.stage === game.incarnationStage + 1);
    if (!next) return null;
    const peakFervor = Math.max(game.fervorPoints, game.fervorPeakThisRun);
    const curMult = game.getEffectiveIncarnationFollowerMultiplier();
    const nextMult = calculateIncarnationFollowerMultiplier(peakFervor, next.stage);
    const discounted = next.stage === 4 && game.hasGnoseUpgrade('gn_apotheosis');
    return {
      cost: `C(estágio ${next.stage} — ${next.name}) = ${formatNumber(game.getIncarnationStageCost(next))} Fé${discounted ? ' (desconto de Gnosis Suprema)' : ''}`,
      bonus: [
        `M_Fervor/s: ×${formatNumber(game.getIncarnationStageMultiplier())} → ×${formatNumber(next.multiplier)}`,
        `M_Fiéis(estágio) = 1 + log10(1 + pico_Fervor / 150) × 1,5 × estágio`,
        `Com pico = ${formatNumber(Math.floor(peakFervor))}: ×${formatNumber(curMult)} → ×${formatNumber(nextMult)} Fé/s`,
      ].join('\n'),
    };
  }

  if (id === 'transmute_relics') {
    const faith = Math.floor(game.faithPoints);
    const relicMult = game.getRelicsBonusMultiplier();
    const toGet = game.getRelicsToGet();
    const bestAfter = Math.max(game.bestRelicsToGet, toGet);
    const passiveBase = calculateExtraRelicsPerSecond(bestAfter);
    return {
      cost: `Consome 100% da Fé atual (${formatNumber(faith)} Fé) · recarga manual: 3s`,
      bonus: [
        `Fragmentos = ⌊log2(Fé + 1) × M_Transmutação⌋`,
        `Com Fé = ${formatNumber(faith)} e M_Transmutação = ×${formatNumber(relicMult)}: +${formatNumber(toGet)} Fragmentos`,
        `Base passiva: max(1, ⌊melhor_Transmutação / 10⌋) = +${formatNumber(passiveBase)} Fragmentos/s`,
      ].join('\n'),
    };
  }

  if (id === 'gnose_reset') {
    const exp = game.getGnoseGainExponent();
    const toGet = game.getGnoseToGet();
    const nextFaith = calculateFaithForNextGnose(game.faithPoints, exp);
    const curPassive = game.getTotalGnosePassiveMultiplier();
    const nextPassive = calculateTotalGnoseMultiplier(game.totalGnoseEarned + toGet);
    return {
      cost: [
        `Reinicia o ciclo terreno (requer Fé ≥ 1e15; atual: ${formatNumber(Math.floor(game.faithPoints))} Fé)`,
        `Próxima Gnose (+${formatNumber(toGet + 1)}): requer ${formatNumber(nextFaith)} Fé`,
      ].join('\n'),
      bonus: [
        `Gnose = ⌊(Fé / 1e15)^${coefficient(exp)}⌋ = +${formatNumber(toGet)} Gnose`,
        `M_Gnose passivo = ${GNOSE_PASSIVE_FORMULA}`,
        `Com Ascensão: ×${formatNumber(curPassive)} → ×${formatNumber(nextPassive)} em Fé e Fervor`,
      ].join('\n'),
    };
  }

  if (id === 'blessing') {
    const eternal = game.hasGnoseUpgrade('gn_bencao_eterna') && game.isIncarnationUnlocked();
    return {
      cost: eternal
        ? `Vigília Perpétua ativa: duração mantida em ${BLESSING_MAX_SECONDS}s sem precisar clicar`
        : `Clique no Altar: +${BLESSING_SECONDS_PER_PRESS}s por clique (acumula até ${BLESSING_MAX_SECONDS}s)`,
      bonus: `M_Bênção = ×2 Fé/s enquanto o temporizador estiver ativo (${Math.ceil(game.incarnationBoostTimer)}s / ${BLESSING_MAX_SECONDS}s)`,
    };
  }

  return null;
}
