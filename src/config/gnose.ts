import type { GnoseUpgrade } from '../types.js';

/** Minimum Fé required to perform a Gnose Prestige Reset (1 Quatrilhão / 1e15, matching DodecaDragons Magic) */
export const GNOSE_MIN_FAITH_REQ = 1e15;

export const GNOSE_TIER_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'I. DESPERTAR & AUTOMAÇÃO',
  2: 'II. PERSISTÊNCIA & ECONOMIA',
  3: 'III. PODER DO CULTO',
  4: 'IV. APOTEOSE'
};

export const GNOSE_SEAL_UPGRADES: Readonly<Record<string, string>> = {
  gn_memoria_selos: 'unlock_incarnation',
};
export const GNOSE_FORMULAS = {
  followerCostStep: 0.01,
  followerCostFactor: 0.4,
  fervorProductionBase: 2.18,
  fervorRitualCostStep: 0.05,
  ritualCostFactor: 0.8,
  relicDirectMultiplier: 2.5,
  relicProductionBase: 3.1,
  relicCostStep: 0.1,
  harmonicBonus: 2,
  harmonicHalfSaturation: 500,
  opusRetention: 0.65,
  empyreanBonusPerStage: 0.15,
  arkBonusPerLevel: 0.25,
  autoTransmutationFraction: 0.1,
} as const;

/** Fixed campaign prices. Within each tier, cheaper nodes appear first.
 * Calibrated without generic production per node. Paired investments remain comparable;
 * the final node improves passive Transmutation. All paths stay purchasable. */
export const GNOSE_UPGRADES: GnoseUpgrade[] = [
  {
    id: 'gn_memoria_selos',
    name: 'Memória Hermética',
    title: 'Tábuas Inquebráveis',
    desc: 'Abre o Selo da Encarnação imediatamente e o mantém aberto após cada Ascensão. Libera Converter Máximo e as opções de compra máxima de Ritos e Relíquias. Os demais Selos continuam sujeitos aos seus custos e requisitos.',
    lore: 'O que foi gravado na Tábua de Esmeralda não pode ser selado novamente pelos séculos mortais.',
    icon: 'scroll',
    tier: 1,
    cost: 2,
    effectText: 'Encarnação permanente · compra máxima de Fiéis, Ritos e Relíquias',
  },
  {
    id: 'gn_init_fervor',
    name: 'Chama Astral',
    title: 'Fogo Inextinguível',
    desc: 'Aprimora permanentemente o Rito "Produção de Fervor" (na aba de Ritos de Fervor) de duas formas: cada nível gera muito mais Fervor/s (a base da fórmula base^(nível^0,6) sobe de 2 para 2,18) e o preço cresce mais devagar a cada compra (+80% → +75% por nível, escala 1,80 → 1,75). O ganho se acumula conforme o Rito sobe — no nível 50, por exemplo, o multiplicador passa de ~1.405× para ~3.460×, além de permitir comprar mais níveis com o mesmo Fervor.',
    lore: 'O fogo que arde acima das esferas planetárias não precisa de lenha terrena para consumir o firmamento.',
    icon: 'fervor',
    tier: 1,
    cost: 4,
    effectText: 'Rito "Produção de Fervor": base 2 → 2,18 · custo +80% → +75% por nível',
  },
  {
    id: 'gn_automation',
    name: 'Culto e Ruptura Autônomos',
    title: 'Devoção e Abertura dos Selos',
    desc: 'A cada segundo, verifica os Selos fechados e compra os que puder pagar, respeitando pré-requisitos e moeda (o Selo da Gnose abre ao atingir seu limiar sem consumir Fé; após cada Ascensão, os Selos voltam a ser comprados, pois não se tornam permanentes). Em seguida, usa Converter Máximo para comprar todos os Fiéis que a Fé disponível permitir, liberando Converter Máximo e pagando o custo total. A conversão automática de Fiéis pode ser pausada no painel dos Fiéis.',
    lore: 'As mentes mortais caminham em sonhos até o pátio da catedral, e cada grilhão se rompe no instante em que a devoção alcança o seu preço.',
    icon: 'gear',
    tier: 1,
    cost: 6,
    effectText: 'Abre Selos e usa Converter Máximo automaticamente a cada 1 s · paga os custos exigidos',
  },
  {
    id: 'gn_relic_gain',
    name: 'Alquimia Astral',
    title: 'Matéria Transfigurada',
    desc: 'Multiplica por 2,5× os Fragmentos obtidos em cada Transmutação (efeito imediato, mesmo antes da Fênix) e aprimora permanentemente o Rito "Ganho de Fragmentos" (nos Ritos de Fervor, liberado ao restaurar a Pena Solar de Fênix): a base da fórmula base^(nível^0,6) sobe de 3 para 3,10 e a escala de custo cai de 5× para 4,90× por compra (+400% → +390%). No nível 20 do Rito, por exemplo, o bônus total passa de ~757× para ~2.306× Fragmentos, com custo ~33% menor no 20º nível.',
    lore: 'O cadinho revela a essência que já repousava na matéria.',
    icon: 'gem',
    tier: 1,
    cost: 8,
    effectText: '2,5× Fragmentos na Transmutação · Rito "Ganho de Fragmentos": base 3 → 3,10 · escala 5 → 4,90',
  },
  {
    id: 'gn_unlimited_relics',
    name: 'Relíquias Ilimitadas',
    title: 'Transbordo do Opus',
    desc: 'Remove o limite de nível da Cornucópia de Amalteia e da Tocha de Prometeu. Os primeiros 20 níveis mantêm o preço original; a partir do 21º nível, cada compra custa 15% a mais. As demais Relíquias mantêm seus limites. Não preserva níveis após a Ascensão.',
    lore: 'O chifre não seca e o fogo roubado não se apaga; bastava romper o selo que os continha.',
    icon: 'ouroboros',
    tier: 1,
    cost: 10,
    effectText: 'Cornucópia e Tocha sem limite de nível (+15% custo após o 20º)',
  },
  {
    id: 'gn_init_faith',
    name: 'Emanação Primordial',
    title: 'Centelha do Nous',
    desc: 'Reduz o aumento de custo por Fiel de 10% para 9%, antes do Cajado de Hermes (escala 1,10 → 1,09). Multiplica a Fé por clique e a Fé/s por 1 + 0,025 × √Fiéis (+2,5% por √Fiéis; com 100 Fiéis, +25%; com 400 Fiéis, +50%). Ao comprar, completa seu saldo até 1.000 Fé; após cada Ascensão, você começa com 1.000 Fé.',
    lore: 'Mesmo quando o templo retorna ao pó, a primeira centelha do Nous permanece acesa na memória da Esfera.',
    icon: 'star',
    tier: 2,
    cost: 20,
    effectText: 'Custo dos Fiéis: +10% → +9% · sinergia: 1 + 0,025 × √Fiéis · início com 1.000 Fé',
  },
  {
    id: 'gn_keep_relics',
    name: 'Cripta Eterna',
    title: 'Preservação do Opus Magnum',
    desc: 'Preserva 100% dos níveis das demais Relíquias após cada Ascensão. Cornucópia de Amalteia e Tocha de Prometeu mantêm 50% dos níveis a cada Ascensão, arredondados para baixo.',
    lore: 'As relíquias dos deuses esquecidos foram fundidas ao próprio núcleo da Esfera, tornando-se imunes à dissolução dos ciclos.',
    icon: 'urn',
    tier: 2,
    cost: 25,
    effectText: 'Demais Relíquias preservadas · Cornucópia e Tocha mantêm 50% dos níveis',
  },
  {
    id: 'gn_ritual_relic_automation',
    name: 'Liturgia e Oficina Autônomas',
    title: 'Ritos e Artífices sem Vigília',
    desc: 'A cada segundo, compra Ritos e restaura Relíquias seguindo a opção Máximo de cada painel: desativada, compra um nível por item; ativada, compra o máximo disponível. Nos Ritos, prioriza o maior ganho por Fervor e reserva o custo de Selos ainda fechados (o Rito de Fragmentos exige a Fênix). Nas Relíquias, prioriza a primeira Fênix e depois o maior retorno por Fragmento, respeitando os limites de nível. Cada automação pode ser pausada no respectivo painel.',
    lore: 'Os cânticos mantêm a chama e as cinzas transmutadas encontram seu lugar nas obras dos antigos deuses, sem aguardar a mão da Esfera.',
    icon: 'gear',
    tier: 2,
    cost: 30,
    effectText: 'Ritos e Relíquias automáticos a cada 1 s · respeita a opção Máximo de cada painel',
  },
  {
    id: 'gn_bencao_eterna',
    name: 'Vigília Perpétua',
    title: 'Êxtase Sem Fim',
    desc: 'Mantém a Bênção permanentemente ativa enquanto a Encarnação estiver desbloqueada (2× Fé/s, +100%, sem precisar recarregar sua duração; não aumenta a Fé por clique) e evolui a Encarnação automaticamente a cada segundo sempre que houver Fé suficiente e o próximo estágio estiver liberado, pagando o custo exigido. A evolução automática pode ser pausada no painel da Encarnação.',
    lore: 'Quando o Profeta contempla a Gnose, sua prece deixa de ser um sopro passageiro e se torna um estado eterno do ser.',
    icon: 'hourglass',
    tier: 2,
    cost: 48,
    effectText: 'Bênção permanente (2× Fé/s) · evolui a Encarnação automaticamente a cada 1 s',
  },
  {
    id: 'gn_followers_syn',
    name: 'Congregação Esférica',
    title: 'Ressonância dos Devotos (MU6)',
    desc: 'Melhora a sinergia dos Fiéis: o multiplicador de Fé por clique e Fé/s passa de 1 + 0,025 × √Fiéis para 1 + √Fiéis. Com 100 Fiéis, passa de 1,25× para 11×; com 400 Fiéis, passa de 1,50× para 21×. Substitui a sinergia da Emanação Primordial; os dois multiplicadores não se acumulam.',
    lore: 'Cada mente devota passa a refletir todas as outras como espelhos dispostos no interior de uma esfera perfeita.',
    icon: 'followers',
    tier: 2,
    cost: 150,
    effectText: 'Sinergia de Fé: 1 + 0,025 × √Fiéis → 1 + √Fiéis',
  },
  {
    id: 'gn_followers_economy',
    name: 'Convergência dos Fiéis',
    title: 'O Chamado Unificado',
    desc: 'Reduz em 60% o preço de cada Fiel. O desconto se aplica às compras individuais, em lote e automáticas, mantendo a escala de custo de Emanação Primordial e do Cajado de Hermes.',
    lore: 'Cada voz reunida torna o chamado seguinte mais fácil de ouvir.',
    icon: 'followers',
    tier: 3,
    cost: 750,
    effectText: '−60% no preço dos Fiéis',
  },
  {
    id: 'gn_followers_cubic',
    name: 'Coro Harmônico',
    title: 'Geometria Sagrada (MU10)',
    desc: 'Altera a sinergia de Fé por clique e Fé/s para 1 + √N × (1 + 2N/(N + 500)), em que N é o total de Fiéis. Com 100 Fiéis, a sinergia passa de 11× para 14,33×. Em cultos maiores, o ganho sobre Congregação Esférica se aproxima de 3×.',
    lore: 'Três dimensões da mente, três oitavas do cântico: a devoção coletiva cresce a cada alma convertida.',
    icon: 'gem',
    tier: 3,
    cost: 1_200,
    effectText: 'Sinergia de Fé: 1 + √N × (1 + 2N/(N + 500))',
  },
  {
    id: 'gn_gnose_mult',
    name: 'Olho de Trismegisto',
    title: 'Tríplice Sabedoria',
    desc: 'Aumenta o expoente do ganho de Gnose por Ascensão de 0,25 para 0,26. O ganho é (Fé ÷ 10^15)^0,26, arredondado para baixo, a partir de 10^15 de Fé.',
    lore: 'Três vezes grande é aquele que enxerga simultaneamente o abismo mortal, o fogo astral e a mente divina.',
    icon: 'eye',
    tier: 3,
    cost: 6_000,
    effectText: 'Gnose por Ascensão: expoente 0,25 → 0,26',
  },
  {
    id: 'gn_eternal_memory',
    name: 'Memória do Opus',
    title: 'Herança dos Artífices',
    desc: 'Com Cripta Eterna, aumenta de 50% para 65% a retenção de níveis da Cornucópia de Amalteia e da Tocha de Prometeu em cada Ascensão, com arredondamento para baixo.',
    lore: 'O fogo dos artífices grava na matéria aquilo que nem os ciclos conseguem apagar.',
    icon: 'urn',
    tier: 3,
    cost: 9_000,
    effectText: 'Com Cripta Eterna: retenção de Cornucópia e Tocha de 50% → 65%',
  },
  {
    id: 'gn_apotheosis',
    name: 'Gnosis Suprema',
    title: 'A Circunferência Infinita',
    desc: 'Reduz em 20% o preço de cada nível de Rito.',
    lore: 'O centro está em toda parte; a circunferência, em lugar nenhum. A Esfera recorda sua plenitude anterior à criação.',
    icon: 'crown',
    tier: 4,
    cost: 75_000,
    effectText: '−20% no preço dos Ritos',
  },
  {
    id: 'gn_empyrean_fire',
    name: 'Fogo Empíreo',
    title: 'A Chama do Firmamento',
    desc: 'Multiplica a geração de Fervor por 1 + 0,15(E − 1), em que E é o estágio da Encarnação. O bônus começa em +15% no Consagrado, chega a +45% no Eclipse e a +60% no Solar.',
    lore: 'A chama já não consome o altar: ilumina o próprio firmamento.',
    icon: 'sun',
    tier: 4,
    cost: 95_000,
    effectText: '+15% de Fervor/s por estágio além do Neófito',
  },
  {
    id: 'gn_perfect_opus',
    name: 'Opus Perfeito',
    title: 'A Matéria Consumada',
    desc: 'Multiplica o efeito da Arca da Aliança Cósmica em Fé/s por 1 + 0,25A, em que A é o nível da Arca. Com a Arca no nível 4, seu efeito dobra.',
    lore: 'Nada se perde no último fogo: toda matéria encontra sua forma sagrada.',
    icon: 'gem',
    tier: 4,
    cost: 115_000,
    effectText: 'Arca: efeito × (1 + 0,25 × nível)',
  },
  {
    id: 'gn_omniscience',
    name: 'Olho do Infinito',
    title: 'Visão Panóptica',
    desc: 'Libera a Auto-Transmutação, que gera por segundo 10% dos Fragmentos que a Transmutação atual renderia, sem gastar Fé. Com o Draupnir restaurado, o total chega a 15%.',
    lore: 'Aquele que tudo vê não apenas compreende o universo: ele se torna a própria mente que o concebe.',
    icon: 'orb',
    tier: 4,
    cost: 200_000,
    effectText: 'Auto-Transmutação: +10% da Transmutação/s · 15% com Draupnir',
  }
];


/** Removed purchases use the historical price for the save revision or a known fallback. */
export const RETIRED_GNOSE_UPGRADES: ReadonlyArray<{ id: string; tier: number; cost?: number }> = [
  { id: 'gn_click_power', cost: 3, tier: 1 },
  { id: 'gn_dilatacao', cost: 3, tier: 1 },
  { id: 'gn_altar_resonance', cost: 118, tier: 2 },
  { id: 'gn_alchemical_mind', cost: 150, tier: 2 },
  { id: 'gn_synergy_boost', cost: 8450, tier: 3 },
  { id: 'gn_relic_resonance', cost: 9900, tier: 3 },
  { id: 'gn_relic_refinement', tier: 3 },
  { id: 'gn_fu1_boost', tier: 3 },
] as const;

export const LEGACY_GNOSE_AUTOMATIONS = [
  { id: 'gn_auto_followers', cost: 3 },
  { id: 'gn_auto_fervor', cost: 5 },
  { id: 'gn_auto_relics', cost: 8 },
] as const;

/** Separate seal purchases are merged and excess paid Gnose is refunded once. */
export const LEGACY_GNOSE_SEAL_AUTOMATIONS = [
  { id: 'gn_fervor_seal', cost: 4, tier: 1 },
  { id: 'gn_relics_seal', cost: 12, tier: 2 },
] as const;

/** Separate ritual and relic automations are merged in Tier 2. */
export const LEGACY_GNOSE_RITUAL_RELIC_AUTOMATIONS = [
  { id: 'gn_ritual_automation', cost: 9 },
  { id: 'gn_relic_automation', cost: 10 },
] as const;

/** Separate seal automation merged into Culto e Ruptura Autônomos (gn_automation). */
export const LEGACY_GNOSE_SEAL_AUTOMATION_DEFAULT_COST = 8;

/** Prices paid before progression revision 1; refund only the difference, never lifetime Gnose. */
export const PROGRESSION_OLD_PRICES: Readonly<Record<string, number>> = {
  gn_automation: 8, gn_ritual_automation: 15, gn_relic_automation: 20, gn_keep_relics: 78,
};

/** Current economy revision persisted in saves for one-time price refunds. */
export const PROGRESSION_REVISION = 11;

/** Prices before weakening and moving Chama Astral and Alquimia Astral to Tier 1. */
export const PROGRESSION_REVISION_8_PRICES: Readonly<Record<string, number>> = {
  gn_memoria_selos: 2,
  gn_automation: 6,
  gn_unlimited_relics: 10,
  gn_init_faith: 20,
  gn_keep_relics: 25,
  gn_ritual_relic_automation: 30,
  gn_bencao_eterna: 48,
  gn_init_fervor: 60,
  gn_relic_gain: 120,
  gn_followers_syn: 150,
  gn_followers_economy: 1200,
  gn_followers_cubic: 1500,
  gn_gnose_mult: 36000,
  gn_eternal_memory: 45000,
  gn_relic_refinement: 200000,
  gn_fu1_boost: 240000,
  gn_apotheosis: 600000,
  gn_empyrean_fire: 660000,
  gn_perfect_opus: 720000,
  gn_omniscience: 2200000,
};

/** Prices paid in revision 9, before the Tier III and IV changes. */
export const PROGRESSION_REVISION_9_PRICES: Readonly<Record<string, number>> = {
  ...PROGRESSION_REVISION_8_PRICES,
  gn_init_fervor: 4,
  gn_relic_gain: 8,
};

/** Prices paid before retiring Alquimia Hermética and Fogo Hermético. */
export const PROGRESSION_REVISION_10_PRICES: Readonly<Record<string, number>> = {
  ...PROGRESSION_REVISION_9_PRICES,
  gn_followers_economy: 750,
  gn_followers_cubic: 1_200,
  gn_gnose_mult: 6_000,
  gn_eternal_memory: 9_000,
  gn_relic_refinement: 26_000,
  gn_fu1_boost: 30_000,
  gn_apotheosis: 75_000,
  gn_empyrean_fire: 95_000,
  gn_perfect_opus: 115_000,
  gn_omniscience: 200_000,
};

/** Prices before merging Culto Autônomo and Ruptura Automática in Tier 1. */
export const PROGRESSION_REVISION_7_PRICES: Readonly<Record<string, number>> = {
  gn_memoria_selos: 2,
  gn_automation: 3,
  gn_seal_automation: 8,
  gn_unlimited_relics: 10,
  gn_init_faith: 20,
  gn_keep_relics: 25,
  gn_ritual_relic_automation: 30,
  gn_bencao_eterna: 48,
  gn_init_fervor: 60,
  gn_relic_gain: 120,
  gn_followers_syn: 150,
  gn_followers_economy: 1200,
  gn_followers_cubic: 1500,
  gn_gnose_mult: 36000,
  gn_eternal_memory: 45000,
  gn_relic_refinement: 200000,
  gn_fu1_boost: 240000,
  gn_apotheosis: 600000,
  gn_empyrean_fire: 660000,
  gn_perfect_opus: 720000,
  gn_omniscience: 2200000,
};

/** Prices before merging ritual/relic automations into Tier 2 and splitting unlimited relics into Tier 1. */
export const PROGRESSION_REVISION_6_PRICES: Readonly<Record<string, number>> = {
  gn_memoria_selos: 2,
  gn_automation: 3,
  gn_seal_automation: 8,
  gn_ritual_automation: 9,
  gn_relic_automation: 10,
  gn_init_faith: 20,
  gn_keep_relics: 25,
  gn_bencao_eterna: 48,
  gn_init_fervor: 60,
  gn_relic_gain: 120,
  gn_followers_syn: 150,
  gn_followers_economy: 1200,
  gn_followers_cubic: 1500,
  gn_gnose_mult: 36000,
  gn_eternal_memory: 45000,
  gn_relic_refinement: 200000,
  gn_fu1_boost: 240000,
  gn_apotheosis: 600000,
  gn_empyrean_fire: 660000,
  gn_perfect_opus: 720000,
  gn_omniscience: 2200000,
};

/** Prices before reordering tiers and pairing choices in 0.12.2. */
export const PROGRESSION_REVISION_5_PRICES: Readonly<Record<string, number>> = {
  gn_init_faith: 1,
  gn_memoria_selos: 2,
  gn_automation: 4,
  gn_init_fervor: 5,
  gn_seal_automation: 8,
  gn_relic_gain: 10,
  gn_ritual_automation: 20,
  gn_relic_automation: 25,
  gn_keep_relics: 48,
  gn_followers_syn: 60,
  gn_bencao_eterna: 120,
  gn_followers_economy: 150,
  gn_followers_cubic: 30_000,
  gn_gnose_mult: 36_000,
  gn_relic_refinement: 200_000,
  gn_fu1_boost: 240_000,
  gn_apotheosis: 300_000,
  gn_empyrean_fire: 600_000,
  gn_perfect_opus: 720_000,
  gn_omniscience: 2_200_000,
};

/** Prices before calibrating time and Ascensions per tier. */
export const PROGRESSION_REVISION_4_PRICES: Readonly<Record<string, number>> = {
  gn_init_faith: 1,
  gn_memoria_selos: 2,
  gn_automation: 4,
  gn_init_fervor: 5,
  gn_seal_automation: 8,
  gn_relic_gain: 10,
  gn_ritual_automation: 16,
  gn_relic_automation: 20,
  gn_keep_relics: 40,
  gn_followers_syn: 48,
  gn_bencao_eterna: 100,
  gn_followers_economy: 120,
  gn_followers_cubic: 240,
  gn_gnose_mult: 300,
  gn_relic_refinement: 800,
  gn_fu1_boost: 1_000,
  gn_omniscience: 2_400,
  gn_apotheosis: 6_000,
  gn_empyrean_fire: 1e12,
  gn_perfect_opus: 1.2e12,
};

/** Investment-path prices before removing generic production per node. */
export const PROGRESSION_REVISION_3_PRICES: Readonly<Record<string, number>> = {
  gn_init_faith: 1,
  gn_memoria_selos: 24,
  gn_automation: 300,
  gn_init_fervor: 360,
  gn_seal_automation: 4_000,
  gn_relic_gain: 4_800,
  gn_ritual_automation: 800_000,
  gn_relic_automation: 1_000_000,
  gn_keep_relics: 1e9,
  gn_followers_syn: 1.2e9,
  gn_bencao_eterna: 1e11,
  gn_followers_economy: 1.2e11,
  gn_followers_cubic: 1e13,
  gn_gnose_mult: 1.2e13,
  gn_relic_refinement: 8e16,
  gn_fu1_boost: 9.6e16,
  gn_omniscience: 2e20,
  gn_apotheosis: 1.7e22,
  gn_empyrean_fire: 1.2e28,
  gn_perfect_opus: 1.44e28,
};

/** Prices before the investment-path revision; refund reductions for existing saves. */
export const PROGRESSION_REVISION_2_PRICES: Readonly<Record<string, number>> = {
  gn_init_faith: 1,
  gn_memoria_selos: 24,
  gn_automation: 300,
  gn_seal_automation: 4_000,
  gn_init_fervor: 60_000,
  gn_relic_gain: 1e8,
  gn_ritual_automation: 800_000,
  gn_relic_automation: 1e7,
  gn_keep_relics: 1e9,
  gn_followers_syn: 1e10,
  gn_bencao_eterna: 1e11,
  gn_followers_economy: 1e12,
  gn_followers_cubic: 1e13,
  gn_gnose_mult: 1e14,
  gn_relic_refinement: 8e16,
  gn_fu1_boost: 2.8e18,
  gn_omniscience: 2e20,
  gn_apotheosis: 1.7e22,
  gn_empyrean_fire: 1.2e28,
  gn_perfect_opus: 9.8e31,
};
/** Revision 1 prices, used only to refund purchases from that revision. */
export const PROGRESSION_REVISION_1_PRICES: Readonly<Record<string, number>> = {
  gn_init_faith: 1,
  gn_memoria_selos: 57,
  gn_init_fervor: 290_000,
  gn_relic_gain: 3.4e8,
  gn_automation: 1_100,
  gn_seal_automation: 26_000,
  gn_ritual_automation: 3.5e6,
  gn_relic_automation: 3.5e7,
  gn_followers_syn: 1.9e10,
  gn_bencao_eterna: 2.9e11,
  gn_keep_relics: 2.5e9,
  gn_followers_economy: 2.3e12,
  gn_followers_cubic: 1.8e13,
  gn_gnose_mult: 1.5e14,
  gn_relic_refinement: 8.0e16,
  gn_fu1_boost: 2.8e18,
  gn_omniscience: 2.0e20,
  gn_apotheosis: 1.7e22,
  gn_empyrean_fire: 1.2e28,
  gn_perfect_opus: 9.8e31,
};

/** Campaign calibration coefficients, shared by game and simulation. */
export const PROGRESSION_BALANCE = {
  ascensionExponent: 0.25,
  enlightenedExponent: 0.26,
  earlySynergyScale: 0.025,
  earlySynergyExponent: 0.5,
  congregationExponent: 0.5,
  solarCost: 1e30,
  fervorResonanceScale: 1e18,
  fervorResonanceExponent: 0.1,
  gnoseProductionScale: 7_000,
  gnoseProductionExponent: 0.35,
  // Gentle early bonus; the campaign-scale contribution fades in gradually.
  gnoseProductionEarlyScale: 0.5,
  gnoseProductionRamp: 1_000,
};

/** Calibration targets for continuous active play; these are not timers or purchase locks. */
export const GNOSE_PACING = { minTierSec: 20 * 60, maxTierSec: 40 * 60, minAscensions: 4, maxAscensions: 12 } as const;
export const GNOSE_PASSIVE_FORMULA = `1 + ${PROGRESSION_BALANCE.gnoseProductionEarlyScale.toLocaleString('pt-BR')} × √Gnose total + ${PROGRESSION_BALANCE.gnoseProductionScale.toLocaleString('pt-BR')} × Gnose total^${PROGRESSION_BALANCE.gnoseProductionExponent.toLocaleString('pt-BR')} × (Gnose total / (Gnose total + ${PROGRESSION_BALANCE.gnoseProductionRamp.toLocaleString('pt-BR')}))²`;

for (const upgrade of GNOSE_UPGRADES) {
  upgrade.desc += ` O total de Gnose obtida em todas as Ascensões também aumenta a Fé por clique, a Fé/s e o Fervor/s. Esse bônus é calculado por ${GNOSE_PASSIVE_FORMULA} e não diminui ao gastar Gnose.`;
}
