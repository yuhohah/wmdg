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
    desc: 'Multiplica toda a Fé gerada por 8×, o Fervor/s por 3×, os Fragmentos por 3,5× e inicia cada ciclo de Gnose com 1.000 Fé.',
    lore: 'Mesmo quando o templo retorna ao pó, a primeira centelha do Nous permanece acesa na memória da Esfera.',
    icon: '✦',
    tier: 1,
    cost: 1,
    prerequisites: [],
    effectText: '8× Fé, 3× Fervor/s, 3,5× Fragmentos e 1.000 Fé inicial'
  },
  {
    id: 'gn_memoria_selos',
    name: 'Memória Hermética',
    title: 'Tábuas Inquebráveis',
    desc: 'Mantém os Selos da Encarnação, Fervor e Relíquias permanentemente rompidos após resets de Gnose, libera Converter Máximo desde 0 fiéis e multiplica Fragmentos por 1,5×.',
    lore: 'O que foi gravado na Tábua de Esmeralda não pode ser selado novamente pelos séculos mortais.',
    icon: '📜',
    tier: 1,
    cost: 2,
    prerequisites: ['gn_init_faith'],
    effectText: 'Mantém Selos abertos, Converter Máx. livre e 1,5× Fragmentos'
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
  {
    id: 'gn_click_power',
    name: 'Pulso Cósmico',
    title: 'Ressonância Manual',
    desc: 'Multiplica o ganho de Fé por clique na Esfera por 10×.',
    lore: 'Cada batida do coração do Profeta reverbera nas engrenagens secretas da Esfera celeste.',
    icon: '⚡',
    tier: 1,
    cost: 3,
    prerequisites: ['gn_init_faith'],
    effectText: '10× Fé por Clique na Esfera'
  },
  {
    id: 'gn_dilatacao',
    name: 'Dilatação Hermética',
    title: 'Tempo Litúrgico',
    desc: 'Acelera a geração de Fé e Fervor em +100% (2×) imediatamente.',
    lore: 'Para os iniciados na Gnose, o fluxo temporal curva-se diante da urgência da verdade divina.',
    icon: '⏳',
    tier: 1,
    cost: 3,
    prerequisites: ['gn_init_faith'],
    effectText: '+100% (2×) Fé/s e Fervor/s'
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
    cost: 10,
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
    cost: 78,
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
    cost: 108,
    prerequisites: ['gn_init_fervor'],
    effectText: 'Bênção da Encarnação ativa permanentemente'
  },
  {
    id: 'gn_altar_resonance',
    name: 'Altar Ressonante',
    title: 'Fervor da Encarnação',
    desc: 'O multiplicador da Encarnação Sagrada também potencializa diretamente a taxa de Fervor por segundo.',
    lore: 'A luz que irradia do avatar santificado alimenta o braseiro perpétuo com o calor de mil sóis.',
    icon: '✨',
    tier: 2,
    cost: 118,
    prerequisites: ['gn_bencao_eterna'],
    effectText: 'Encarnação multiplica Fervor/s'
  },
  {
    id: 'gn_alchemical_mind',
    name: 'Transmutação Áurea',
    title: 'Mente Alquímica',
    desc: 'Multiplica por 4× o ganho de Fragmentos Alquímicos nas Transmutações.',
    lore: 'O chumbo da matéria impura dissolve-se instantaneamente na prata viva do pensamento gnóstico.',
    icon: '⚗️',
    tier: 2,
    cost: 150,
    prerequisites: ['gn_keep_relics'],
    effectText: '4× Fragmentos em Transmutações'
  },

  // --- TIER 3: EVOLUÇÕES HERMÉTICAS ---
  {
    id: 'gn_followers_cubic',
    name: 'Coro Cúbico',
    title: 'Geometria Sagrada (MU10)',
    desc: 'Evolui a sinergia da Congregação Esférica de (1 + Fiéis^1.5) para a escala cúbica (1 + Fiéis^3).',
    lore: 'Três dimensões da mente, três oitavas do cântico: a devoção coletiva cresce ao cubo de cada alma convertida.',
    icon: '💠',
    tier: 3,
    cost: 170,
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
    cost: 3380,
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
    cost: 1020,
    prerequisites: ['gn_bencao_eterna'],
    effectText: '2,5× Gnose obtida e 3× efeito da Encarnação'
  },
  {
    id: 'gn_synergy_boost',
    name: 'Forja Cósmica',
    title: 'Ardor Triunfante',
    desc: 'Multiplica em 5× o efeito do 5º Rito de Fervor ("Fé Aumenta Fervor/s").',
    lore: 'A Fé depositada no abismo do cosmos retorna como uma torrente incontrolável de fogo estelar.',
    icon: '🌌',
    tier: 3,
    cost: 8450,
    prerequisites: ['gn_fu1_boost'],
    effectText: '5× efeito do 5º Rito de Fervor'
  },
  {
    id: 'gn_relic_resonance',
    name: 'Harmonia Planetária',
    title: 'Música das Esferas',
    desc: 'Cada Relíquia única com nível maior que 0 concede +50% de Fé/s e +50% de Fervor/s global.',
    lore: 'Cada artefato sagrado vibra em consonância com as órbitas dos planetas, amplificando o louvor cósmico.',
    icon: '🪐',
    tier: 3,
    cost: 9900,
    prerequisites: ['gn_keep_relics'],
    effectText: '+50% Fé/s e Fervor/s por Relíquia ativa'
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
    cost: 32200,
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
    cost: 37800,
    prerequisites: ['gn_fu1_boost'],
    effectText: 'Auto-compra Ritos de Fervor/s sem gastar Fervor'
  },
  {
    id: 'gn_auto_relics',
    name: 'Transmutação Espontânea',
    title: 'O Cadinho Vivo',
    desc: 'Gera automaticamente +100% da Transmutação Alquímica a cada segundo, sem gastar Fé.',
    lore: 'A matéria se transubstancia espontaneamente em ouro celestial sem a necessidade de intervenção mortal.',
    icon: '💠',
    tier: 4,
    cost: 43800,
    prerequisites: ['gn_relic_resonance'],
    effectText: '+100% Transmutação/s contínua'
  },
  {
    id: 'gn_omniscience',
    name: 'Olho do Infinito',
    title: 'Visão Panóptica',
    desc: 'Dobra (2×) o ganho de Gnose em resets e amplia o bônus passivo de toda Gnose em +50%.',
    lore: 'Aquele que tudo vê não apenas compreende o universo: ele se torna a própria mente que o concebe.',
    icon: '🔮',
    tier: 4,
    cost: 14700,
    prerequisites: ['gn_gnose_mult'],
    effectText: '2× Gnose em resets e +50% bônus passivo'
  },
  {
    id: 'gn_apotheosis',
    name: 'Gnosis Suprema',
    title: 'A Circunferência Infinita',
    desc: 'Multiplica toda Fé e Fervor por 100×, dobra o ganho de Gnose (2×) e reduz em 100.000× o custo dos Estágios IV e V da Encarnação.',
    lore: 'O centro está em toda parte; a circunferência, em lugar nenhum. A Esfera recorda sua plenitude anterior à criação.',
    icon: '👑',
    tier: 4,
    cost: 45800,
    prerequisites: ['gn_auto_followers', 'gn_auto_fervor', 'gn_gnose_mult'],
    effectText: '100× Fé/Fervor, 2× Gnose e Estágios IV–V barateados'
  }
];
