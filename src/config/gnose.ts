import type { GnoseUpgrade } from '../types.js';

/** Minimum Fé required to perform a Gnose Prestige Reset (1 Quatrilhão / 1e15, matching DodecaDragons Magic) */
export const GNOSE_MIN_FAITH_REQ = 1e15;

export const GNOSE_TIER_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'I. DESPERTAR GNÓSTICO',
  2: 'II. PERSISTÊNCIA & SINERGIA',
  3: 'III. EVOLUÇÕES HERMÉTICAS',
  4: 'IV. AUTOMAÇÃO & APOTEOSE'
};

export const GNOSE_UPGRADES: GnoseUpgrade[] = [
  // --- TIER 1: DESPERTAR GNÓSTICO ---
  {
    id: 'gn_init_faith',
    name: 'Emanação Primordial',
    title: 'Centelha do Nous',
    desc: 'Multiplica toda a Fé gerada (clique e passiva) por 5× e inicia cada ciclo de Gnose com 1.000 Fé.',
    lore: 'Mesmo quando o templo retorna ao pó, a primeira centelha do Nous permanece acesa na memória da Esfera.',
    icon: '✦',
    tier: 1,
    cost: 1,
    prerequisites: [],
    effectText: '5× Fé Global e inicia com 1.000 Fé'
  },
  {
    id: 'gn_memoria_selos',
    name: 'Memória Hermética',
    title: 'Tábuas Inquebráveis',
    desc: 'Mantém os Selos da Encarnação, Fervor e Relíquias permanentemente rompidos após resets de Gnose e libera Converter Máximo desde 0 fiéis.',
    lore: 'O que foi gravado na Tábua de Esmeralda não pode ser selado novamente pelos séculos mortais.',
    icon: '📜',
    tier: 1,
    cost: 2,
    prerequisites: ['gn_init_faith'],
    effectText: 'Mantém Selos abertos e Converter Máx. livre'
  },
  {
    id: 'gn_init_fervor',
    name: 'Chama Astral',
    title: 'Fogo Inextinguível',
    desc: 'Multiplica a produção de Fervor/s por 5× e triplica (3×) o ganho de Fragmentos nas Transmutações.',
    lore: 'O fogo que arde acima das esferas planetárias não precisa de lenha terrena para consumir o firmamento.',
    icon: '🔥',
    tier: 1,
    cost: 2,
    prerequisites: ['gn_init_faith'],
    effectText: '5× Fervor/s e 3× Ganho de Fragmentos'
  },

  // --- TIER 2: PERSISTÊNCIA & SINERGIA ---
  {
    id: 'gn_followers_syn',
    name: 'Congregação Esférica',
    title: 'Ressonância dos Devotos (MU6)',
    desc: 'O total de Fiéis Devotos multiplica diretamente toda a produção de Fé pela fórmula (1 + Fiéis^1.5).',
    lore: 'Cada mente devota passa a refletir todas as outras como espelhos dispostos no interior de uma esfera perfeita.',
    icon: '👥',
    tier: 2,
    cost: 5,
    prerequisites: ['gn_memoria_selos'],
    effectText: 'Multiplica Fé por (1 + Fiéis^1.5)'
  },
  {
    id: 'gn_keep_relics',
    name: 'Cripta Eterna',
    title: 'Preservação do Opus Magnum',
    desc: 'Mantém 100% dos níveis das Relíquias restauradas após resets de Gnose e gera +25% da Transmutação atual por segundo.',
    lore: 'As relíquias dos deuses esquecidos foram fundidas ao próprio núcleo da Esfera, tornando-se imunes à dissolução dos ciclos.',
    icon: '🏺',
    tier: 2,
    cost: 8,
    prerequisites: ['gn_memoria_selos', 'gn_init_fervor'],
    effectText: 'Mantém Relíquias no reset e +25% Transmutação/s'
  },
  {
    id: 'gn_bencao_eterna',
    name: 'Vigília Perpétua',
    title: 'Êxtase Sem Fim',
    desc: 'A Bênção da Encarnação permanece ativa na carga máxima permanentemente, sem drenar com o tempo.',
    lore: 'Quando o Profeta contempla a Gnose, sua prece deixa de ser um sopro passageiro e se torna um estado eterno do ser.',
    icon: '⏳',
    tier: 2,
    cost: 6,
    prerequisites: ['gn_init_fervor'],
    effectText: 'Bênção da Encarnação ativa permanentemente'
  },

  // --- TIER 3: EVOLUÇÕES DE FÓRMULA DODECADRAGONS ---
  {
    id: 'gn_followers_cubic',
    name: 'Coro Cúbico',
    title: 'Geometria Sagrada (MU10)',
    desc: 'Evolui a sinergia da Congregação Esférica de (1 + Fiéis^1.5) para a escala cúbica (1 + Fiéis^3).',
    lore: 'Três dimensões da mente, três oitavas do cântico: a devoção coletiva cresce ao cubo de cada alma convertida.',
    icon: '💠',
    tier: 3,
    cost: 20,
    prerequisites: ['gn_followers_syn'],
    effectText: 'Evolui sinergia dos Fiéis para (1 + Fiéis^3)'
  },
  {
    id: 'gn_fu1_boost',
    name: 'Fogo Hermético',
    title: 'Quinta-Essência Ígnea (MU14)',
    desc: 'Evolui a fórmula do 1º Rito de Fervor ("Aumentar Produção de Fervor") de 2^(Nível^0.6) para 3.5^(Nível^0.7).',
    lore: 'O fogo comum queima a matéria; o Fogo Hermético transmuta a própria lei matemática que rege o ardor do culto.',
    icon: '☀️',
    tier: 3,
    cost: 25,
    prerequisites: ['gn_keep_relics'],
    effectText: '1º Rito de Fervor evolui para 3.5^(Nível^0.7)'
  },
  {
    id: 'gn_gnose_mult',
    name: 'Olho de Trismegisto',
    title: 'Tríplice Sabedoria',
    desc: 'Multiplica o ganho de Gnose em resets por 2,5× e triplica (3×) o efeito da Encarnação sobre os Fiéis.',
    lore: 'Três vezes grande é aquele que enxerga simultaneamente o abismo mortal, o fogo astral e a mente divina.',
    icon: '👁️',
    tier: 3,
    cost: 30,
    prerequisites: ['gn_bencao_eterna'],
    effectText: '2,5× Gnose obtida e 3× efeito da Encarnação'
  },

  // --- TIER 4: AUTOMAÇÃO & APOTEOSE ---
  {
    id: 'gn_auto_followers',
    name: 'Recrutamento Astral',
    title: 'Chamado Silencioso',
    desc: 'Converte automaticamente o máximo possível de Fiéis Devotos a cada segundo, sem descontar a Fé acumulada.',
    lore: 'Você não precisa mais chamar: as mentes mortais caminham em sonhos até o pátio da catedral por pura gravidade espiritual.',
    icon: '⚙️',
    tier: 4,
    cost: 75,
    prerequisites: ['gn_followers_cubic'],
    effectText: 'Auto-converte Fiéis/s sem gastar Fé'
  },
  {
    id: 'gn_auto_fervor',
    name: 'Ritos Automáticos',
    title: 'Liturgia Autônoma',
    desc: 'Eleva automaticamente todos os Ritos de Fervor acessíveis a cada segundo, sem descontar o Fervor acumulado.',
    lore: 'Os altares alimentam a si mesmos em perpétua liturgia, elevando os ritos assim que a chama atinge a ressonância exigida.',
    icon: '🕯️',
    tier: 4,
    cost: 100,
    prerequisites: ['gn_fu1_boost'],
    effectText: 'Auto-compra Ritos de Fervor/s sem gastar Fervor'
  },
  {
    id: 'gn_apotheosis',
    name: 'Gnosis Suprema',
    title: 'A Circunferência Infinita',
    desc: 'Multiplica toda Fé e Fervor por 100×, dobra o ganho de Gnose (2×) e reduz em 100.000× o custo dos Estágios IV e V da Encarnação.',
    lore: 'O centro está em toda parte; a circunferência, em lugar nenhum. A Esfera recorda sua plenitude anterior à criação.',
    icon: '👑',
    tier: 4,
    cost: 250,
    prerequisites: ['gn_auto_followers', 'gn_auto_fervor', 'gn_gnose_mult'],
    effectText: '100× Fé/Fervor, 2× Gnose e Estágios IV–V barateados'
  }
];
