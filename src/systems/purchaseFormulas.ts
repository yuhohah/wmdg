import type { GameStateManager } from '../core/GameState.js';
import { GNOSE_UPGRADES, GNOSE_FORMULAS, PROGRESSION_BALANCE } from '../config/gnose.js';
import { INCARNATION_STAGES } from '../config/incarnation.js';
import { calculateCostDiscountMultiplier } from './calculations.js';

export interface PurchaseFormulas { cost: string; bonus: string }

// Keep coefficients readable without changing the underlying purchase calculations.
const coefficient = (value: number) => String(Number(value.toPrecision(12)));

function followerBonusFormula(game: GameStateManager, bulk: boolean): string {
  // Only the follower Rito and Gnose synergy depend on N. Collect the other live
  // production multipliers into one coefficient, without changing game state.
  const count = game.getTotalFollowersCount();
  const sampleCount = Math.max(1, count);
  const sampleProduction = count > 0 ? game.getFaithPerSecond() : game.getFollowerPurchaseFaithGain(1);
  const ritual = game.fervorUpgrades.find(upg => upg.id === 'fu_followers')!;
  const ritualEffect = game.getFervorUpgradeEffect(ritual, sampleCount);
  const synergyEffect = game.getGnoseFollowersSynergyMultiplier(sampleCount) / game.getGnoseReconstructionMultiplier();
  const constant = sampleProduction / (sampleCount * ritualEffect * synergyEffect);
  const ritualTerm = ritual.level > 0 ? ` × (1 + ${ritual.level}^1.5 × N / 50)` : '';
  const hasSynergy = game.hasGnoseUpgrade('gn_followers_syn') || game.hasGnoseUpgrade('gn_init_faith');
  const exponent = game.hasGnoseUpgrade('gn_followers_syn')
    ? game.hasGnoseUpgrade('gn_followers_cubic') ? 1.1 : PROGRESSION_BALANCE.congregationExponent
    : PROGRESSION_BALANCE.earlySynergyExponent;
  const synergyTerm = hasSynergy ? ` × (1 + N^${exponent})` : '';
  return `P(N) = ${coefficient(constant)} × N${ritualTerm}${synergyTerm}; ΔFé/s = P(Fiéis + ${bulk ? 'n' : '1'}) − P(Fiéis)`;
}

const gnoseBonuses: Record<string, string> = {
  gn_init_faith: 'escala_Fiéis′ = escala_Fiéis − 0.01; Fé_inicial = 1000; M_sinergia = 1 + Fiéis^0.5',
  gn_memoria_selos: 'Selo_Encarnação(após ascender) = 1; compras_máximas = 1',
  gn_init_fervor: `base_Fervor = ${GNOSE_FORMULAS.fervorProductionBase}; escala_Rito_Fervor′ = escala_Rito_Fervor − ${GNOSE_FORMULAS.ritualCostStep}`,
  gn_relic_gain: `base_Fragmentos = ${GNOSE_FORMULAS.relicProductionBase}; escala_Rito_Fragmentos′ = escala_Rito_Fragmentos − ${GNOSE_FORMULAS.relicCostStep}`,
  gn_automation: 'Auto_Fiéis = 1; Fé′ = Fé − Σ Custo_Fiel',
  gn_seal_automation: 'Auto_Selos = 1; Fé′ = Fé − Σ Custo_Selo',
  gn_ritual_automation: 'Auto_Ritos = 1; Fervor′ = Fervor − Σ Custo_Rito; Δnível ≤ 50/rito/s',
  gn_relic_automation: 'Auto_Relíquias = 1; Fragmentos′ = Fragmentos − Σ Custo_Relíquia',
  gn_followers_syn: `M_sinergia = 1 + Fiéis^${PROGRESSION_BALANCE.congregationExponent}`,
  gn_bencao_eterna: 'M_Bênção = 2',
  gn_keep_relics: 'nível_Relíquias(após ascender) = nível_Relíquias(antes)',
  gn_followers_economy: `escala_Fiéis′ = escala_Fiéis − ${GNOSE_FORMULAS.followerEconomyStep}`,
  gn_followers_cubic: 'M_sinergia = 1 + Fiéis^1.1',
  gn_gnose_mult: `Gnose = ⌊(Fé / 10^15)^${PROGRESSION_BALANCE.enlightenedExponent}⌋; Fé ≥ 10^15`,
  gn_relic_refinement: `base_Fragmentos = ${GNOSE_FORMULAS.refinedRelicProductionBase}; escala_Rito_Fragmentos′ = escala_Rito_Fragmentos − ${GNOSE_FORMULAS.refinedRelicCostStep}`,
  gn_fu1_boost: `base_Fervor = ${GNOSE_FORMULAS.hermeticProductionBase}`,
  gn_omniscience: 'Custo_Auto_Fiéis = Custo_Auto_Ritos = 0; ΔFragmentos/s = Transmutação(Fé) × 4^nós',
  gn_apotheosis: `escala_Ritos′ = escala_Ritos − ${GNOSE_FORMULAS.ritualCostStep}; C_Eclipse = 10^20; C_Solar = ${PROGRESSION_BALANCE.solarCost}`,
  gn_empyrean_fire: `base_Fervor = ${GNOSE_FORMULAS.empyreanProductionBase}; escala_Rito_Fervor′ = escala_Rito_Fervor − ${GNOSE_FORMULAS.empyreanRitualCostStep}`,
  gn_perfect_opus: `base_Fragmentos = ${GNOSE_FORMULAS.perfectRelicProductionBase}; escala_Rito_Fragmentos′ = escala_Rito_Fragmentos − ${GNOSE_FORMULAS.perfectRelicCostStep}`,
};

const relicBonuses: Record<string, string> = {
  relic_cornucopia: 'M_Fé/s(nível) = 1 + 0.20 × nível',
  relic_torch: 'M_Fervor/s(nível) = 1 + 0.20 × nível',
  relic_phoenix: 'M_Fervor/s = 1.5; Rito_Fragmentos = 1',
  relic_caduceus: 'escala_Fiéis = max(1.05, 1.10 − 0.005 × nível − descontos_Gnose)',
  relic_draupnir: 'ΔFragmentos/s = 0.05 × Transmutação(Fé) × 4^nós',
  relic_ark: 'M_Fé/s(nível) = (log10(max(Fragmentos, pico_Fragmentos) + 1) + 1)^(1.2 × nível)',
};

/** Returns only mathematical purchase information, using the live economy's coefficients. */
export function getPurchaseFormulas(game: GameStateManager, id: string, bulk = false): PurchaseFormulas | null {
  const follower = game.followers.find(item => item.id === id);
  if (follower) {
    const scale = follower.id === 'f_devotee' ? game.getDevoteeBaseMultiplier() : follower.costMultiplier;
    const discount = follower.id === 'f_devotee' ? calculateCostDiscountMultiplier(game.achievements) : 1;
    const single = `max(1, ⌊⌊${follower.baseCost} × ${coefficient(scale)}^N⌋ × ${coefficient(discount)}⌋)`;
    return {
      cost: bulk ? `C(n) = Σ[i=0…n−1] C(N+i); C(N) = ${single} Fé; n = max{m ≤ 10000 : C(m) ≤ Fé}`
        : `C(N) = ${single} Fé; N = Fiéis`,
      bonus: followerBonusFormula(game, bulk),
    };
  }

  const ritual = game.fervorUpgrades.find(upg => upg.id === id);
  if (ritual) {
    const base = coefficient(game.getFervorUpgradeEffect({ ...ritual, level: 1 }));
    const effects: Record<string, string> = {
      fu_prod: `M_Fervor/s(nível) = ${base}^(nível^0.6)`,
      fu_effect: 'M_efeito_Fervor(nível) = 1.25^(nível^0.8)',
      fu_click: 'M_Fé/clique(nível) = 4 × nível^2.6 + 1',
      fu_followers: 'M_Fé/s(nível) = nível^1.5 × Fiéis / 50 + 1',
      fu_synergy: 'M_Fervor/s(nível) = nível^1.5 × log10(max(0, Fé) + 1) / 5 + 1',
      fu_relics: `M_Transmutação(nível) = ${base}^(nível^0.6)`,
    };
    const single = `⌊${ritual.baseCost} × ${coefficient(game.getFervorUpgradeCostMultiplier(ritual))}^nível⌋`;
    return { cost: bulk ? `C(n) = Σ[i=0…n−1] C(nível+i); C(nível) = ${single} Fervor; n ≤ 100`
      : `C(nível) = ${single} Fervor`, bonus: effects[id] };
  }

  const relic = game.relicUpgrades.find(upg => upg.id === id);
  if (relic) return {
    cost: bulk ? `C(n) = n × ${relic.cost} Fragmentos; n ≤ ${relic.maxLevel} − nível`
      : `C(nível) = ${relic.cost} Fragmentos; nível < ${relic.maxLevel}`,
    bonus: relicBonuses[id],
  };

  const gnose = GNOSE_UPGRADES.find(upg => upg.id === id);
  if (gnose) return {
    cost: `C = ${gnose.cost} Gnose`,
    bonus: `M_produção = ${PROGRESSION_BALANCE.nodeProductionMultiplier}^nós; ${gnoseBonuses[id]}`,
  };

  const seal = game.unlocks.find(upg => upg.id === id);
  if (seal) {
    const effects: Record<string, string> = {
      unlock_incarnation: 'Encarnação = 1; Fervor_base/s = 1',
      unlock_fervor_upgrades: 'Ritos_Fervor = 1',
      unlock_relics: `Fragmentos_Transmutação = ⌊log2(Fé + 1) × M_Transmutação⌋`,
      unlock_gnose: `Gnose = ⌊(Fé / 10^15)^${game.getGnoseGainExponent()}⌋; Fé ≥ 10^15`,
    };
    return { cost: seal.id === 'unlock_gnose' ? 'C = 0 Fé; Fé ≥ 10^15'
      : `C = ${seal.cost} ${seal.costCurrency === 'faith' ? 'Fé' : 'Fervor'}`, bonus: effects[id] };
  }

  if (id === 'incarnation') {
    const next = INCARNATION_STAGES.find(stage => stage.stage === game.incarnationStage + 1);
    if (!next) return null;
    return {
      cost: `C(estágio ${next.stage}) = ${game.getIncarnationStageCost(next)} Fé`,
      bonus: `M_Fervor/s = ${next.multiplier}; M_Fiéis = 1 + log10(1 + max(Fervor, pico_Fervor) / 150) × 1.5 × ${next.stage}`,
    };
  }
  return null;
}
