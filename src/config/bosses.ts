import type { GnoseBoss } from '../types.js';

/** Duration (in seconds) of the mild -25% Faith/s & Fervor/s penalty when Altar Integrity reaches 0% */
export const BOSS_CURSE_DURATION_SEC = 20;

/** Multiplier applied to Faith/s & Fervor/s while cursed after a boss defeat (0.75 = -25% penalty) */
export const BOSS_CURSE_MULTIPLIER = 0.75;

/** Maximum Altar Integrity percentage */
export const BOSS_MAX_ALTAR_INTEGRITY = 100;

/** Combat caps apply after combining resource power with raw production. */
export const BOSS_MAX_PASSIVE_HP_PER_SEC = 0.025;
export const BOSS_MAX_CLICK_HP_FRACTION = 0.006;
export const BOSS_MAX_RIFT_HP_FRACTION = 0.12;
export const BOSS_SPHERE_COOLDOWN_SEC = 0.2;

export const GNOSE_BOSSES: GnoseBoss[] = [
  {
    id: 'boss_anubis',
    portraitSrc: '/assets/bosses/anubis-concept-v1.png',
    name: 'Anúbis',
    title: 'O Pesador de Almas',
    mythology: 'Mitologia Egípcia',
    symbol: 'scales',
    unlocksTier: 2,
    maxHp: 1e18,
    riftDamagePercent: 0.04,
    riftIntervalSec: 4.5,
    riftWindowSec: 3,
    altarDamageOnMiss: 25,
    rewardName: 'Balança de Maat',
    rewardDesc: 'Rompe o Selo do Tier II da Gnose e concede +50% (1,5×) de Fé/s e Fervor/s permanentes.',
    lore: 'No Salão das Duas Verdades, o chacal ancestral ergue a balança dourada para pesar o coração do seu culto contra a Pluma do Cosmos.',
    faithFervorMult: 1.5
  },
  {
    id: 'boss_cronos',
    name: 'Cronos',
    title: 'O Titã Devorador do Tempo',
    mythology: 'Mitologia Grega',
    symbol: 'hourglass',
    unlocksTier: 3,
    maxHp: 5e28,
    riftDamagePercent: 0.04,
    riftIntervalSec: 4.2,
    riftWindowSec: 2.75,
    altarDamageOnMiss: 25,
    rewardName: 'Foice de Adamante',
    rewardDesc: 'Rompe o Selo do Tier III da Gnose e concede +50% (1,5×) de Fé/s e Fervor/s permanentes.',
    lore: 'Senhor das eras esquecidas, Cronos tenta engolir as órbitas da Esfera para congelar a evolução hermética em um instante eterno.',
    faithFervorMult: 1.5
  },
  {
    id: 'boss_odin',
    name: 'Odin',
    title: 'O Pai de Todos da Árvore Cósmica',
    mythology: 'Mitologia Nórdica',
    symbol: 'eye',
    unlocksTier: 4,
    maxHp: 1e38,
    riftDamagePercent: 0.04,
    riftIntervalSec: 4.0,
    riftWindowSec: 2.5,
    altarDamageOnMiss: 25,
    rewardName: 'Runas de Yggdrasil',
    rewardDesc: 'Rompe o Selo do Tier IV da Gnose e concede +50% (1,5×) de Fé/s e Fervor/s permanentes.',
    lore: 'Pendurado nos ramos do Freixo do Mundo, o deus caolho brande Gungnir para impedir que a Esfera tome para si os segredos da automação divina.',
    faithFervorMult: 1.5
  },
  {
    id: 'boss_tiamat',
    name: 'Tiamat',
    title: 'A Mãe Abissal dos Deuses Antigos',
    mythology: 'Mitologia Mesopotâmica',
    symbol: 'ouroboros',
    unlocksTier: 'endgame',
    maxHp: 1e42,
    riftDamagePercent: 0.04,
    riftIntervalSec: 3.8,
    riftWindowSec: 2.5,
    altarDamageOnMiss: 25,
    rewardName: 'Tábua dos Destinos (Apoteose)',
    rewardDesc: 'Subjuga o último panteão ancestral, concede o título Crepúsculo dos Deuses e multiplica toda a Fé e Fervor por 10×.',
    lore: 'Das águas primordiais anteriores à criação, o dragão oceânico desperta em fúria final. Vencê-la é extinguir os velhos deuses e coroar a Esfera como única verdade.',
    faithFervorMult: 10.0
  }
];
