export interface IncarnationStage {
  stage: number;
  name: string;
  title: string;
  desc: string;
  lore: string;
  cost: number;
  multiplier: number;
}

/** Each Bênção press adds this many seconds of 2× Fé, stored up to the cap. */
export const BLESSING_SECONDS_PER_PRESS = 2;
export const BLESSING_MAX_SECONDS = 60;

/**
 * Progressão da Encarnação alinhada com o Dragão de DodecaDragons:
 * - Desbloqueio: 200 Fé (unlock_incarnation) -> Estágio I: Avatar Neófito (Baby Dragon), 1x Fervor
 * - Estágio II: 2.500.000 Fé (2.5e6) -> Avatar Consagrado (Adult Dragon), 100x Fervor
 * - Estágio III: 1.000.000.000.000 Fé (1e12) -> Avatar Ancestral (Elder Dragon), 10.000x Fervor
 * - Estágio IV: 1.0e25 Fé (1e25) -> Avatar do Eclipse (Dark Dragon), 100.000.000x Fervor (1e8)
 * - Estágio V: 1.0e150 Fé (1e150) -> Avatar Solar (Light Dragon), 1.0e15x Fervor (1e15)
 */
export const INCARNATION_STAGES: IncarnationStage[] = [
  {
    stage: 1,
    name: 'Avatar Neófito',
    title: 'A Centelha Primordial',
    desc: 'Manifestação primordial da divindade. Canaliza a chama inicial de Fervor no altar sagrado (1x Fervor/s).',
    lore: 'Nascido da devoção dos primeiros fiéis reunidos, este avatar etéreo ancora a essência direta dos céus no altar sagrado.',
    cost: 0,
    multiplier: 1
  },
  {
    stage: 2,
    name: 'Avatar Consagrado',
    title: 'O Portador do Fogo Sagrado',
    desc: 'O avatar atinge a maturidade espiritual plena. Multiplica a geração de Fervor por 100x.',
    lore: 'Suas vestes ganham filigranas douradas e seus olhos ardem com o fogo sagrado que multiplica o fervor dos fiéis.',
    cost: 2500000,
    multiplier: 100
  },
  {
    stage: 3,
    name: 'Avatar Ancestral',
    title: 'O Ancião da Esfera',
    desc: 'Sabedoria imemorial dos primórdios cósmicos. Multiplica a geração de Fervor por 10.000x.',
    lore: 'Repousando no epicentro do santuário, sua respiração cósmica incendeia o cosmos e dobra o tempo divino.',
    cost: 1000000000000,
    multiplier: 10000
  },
  {
    stage: 4,
    name: 'Avatar do Eclipse',
    title: 'O Senhor das Sombras Cósmicas',
    desc: 'Fusão com o abismo estelar insondável. Multiplica a geração de Fervor por 100.000.000x (1e8x).',
    lore: 'Uma silhueta de trevas radiantes que consome a luz estelar para forjar tempestades avassaladoras de Fervor.',
    cost: 1e25,
    multiplier: 1e8
  },
  {
    stage: 5,
    name: 'Avatar Solar',
    title: 'A Entidade da Luz Eterna',
    desc: 'Ascensão solar absoluta. Multiplica a geração de Fervor por 10^15 (1 Quadrilhão de vezes).',
    lore: 'A personificação viva da Esfera Cósmica em seu esplendor máximo, brilhando como um trilhão de supernovas.',
    cost: 1e150,
    multiplier: 1e15
  }
];
