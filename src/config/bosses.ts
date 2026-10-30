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
    altarPressurePerSec: 0.65,
    requirements: {
      faithLog: 15,
      followers: 120,
      fervorLog: 7,
      fervorLevels: 35,
      relicsLog: 2.5,
      relicLevels: 6,
      incarnationStage: 2,
      gnoseLog: 0,
      gnoseNodes: 1
    },
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
    riftDamagePercent: 0.038,
    riftIntervalSec: 4.2,
    riftWindowSec: 2.75,
    altarDamageOnMiss: 28,
    altarPressurePerSec: 0.95,
    requirements: {
      faithLog: 22,
      followers: 240,
      fervorLog: 11,
      fervorLevels: 80,
      relicsLog: 3.5,
      relicLevels: 18,
      incarnationStage: 3,
      gnoseLog: 1.2,
      gnoseNodes: 5
    },
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
    riftDamagePercent: 0.036,
    riftIntervalSec: 4.0,
    riftWindowSec: 2.5,
    altarDamageOnMiss: 32,
    altarPressurePerSec: 1.25,
    requirements: {
      faithLog: 30,
      followers: 400,
      fervorLog: 15,
      fervorLevels: 150,
      relicsLog: 4.5,
      relicLevels: 35,
      incarnationStage: 4,
      gnoseLog: 2.4,
      gnoseNodes: 10
    },
    rewardName: 'Runas de Yggdrasil',
    rewardDesc: 'Rompe o Selo do Tier IV da Gnose e concede +50% (1,5×) de Fé/s e Fervor/s permanentes.',
    lore: 'Pendurado nos ramos do Freixo do Mundo, o deus caolho brande Gungnir para impedir que a Esfera tome para si os segredos da automação divina.',
    faithFervorMult: 1.5
  },
  {
    // Keep the legacy save key so previous victories and rewards remain valid.
    id: 'boss_tiamat',
    name: 'Caos Primordial',
    title: 'O Vazio Antes da Criação',
    mythology: 'Cosmogonia Primordial',
    symbol: 'ouroboros',
    unlocksTier: 'endgame',
    maxHp: 1e42,
    riftDamagePercent: 0.035,
    riftIntervalSec: 3.8,
    riftWindowSec: 2.5,
    altarDamageOnMiss: 36,
    altarPressurePerSec: 1.65,
    requirements: {
      faithLog: 38,
      followers: 600,
      fervorLog: 20,
      fervorLevels: 250,
      relicsLog: 5.5,
      relicLevels: 50,
      incarnationStage: 5,
      gnoseLog: 3.5,
      gnoseNodes: 17
    },
    rewardName: 'Selo da Criação (Apoteose)',
    rewardDesc: 'Domina o Caos Primordial, concede o título Crepúsculo dos Deuses e multiplica toda a Fé e Fervor por 10×.',
    lore: 'Antes dos deuses, das órbitas e da própria matéria, havia apenas o Caos. O vazio primordial desperta para dissolver a criação. Toda a força reunida pelo culto será posta à prova para que a Esfera imponha ordem ao infinito.',
    faithFervorMult: 10.0
  }
];
