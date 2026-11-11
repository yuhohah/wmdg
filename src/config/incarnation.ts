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
export const BLESSING_SECONDS_PER_PRESS = 3;
export const BLESSING_MAX_SECONDS = 60;

/**
 * Progressão da Encarnação alinhada com o Dragão de DodecaDragons:
 * - Desbloqueio: 200 Fé (unlock_incarnation) -> Estágio I: Avatar Neófito (Baby Dragon), 2x Fervor
 * - Estágio II: 2.500.000 Fé (2.5e6) -> Avatar Consagrado (Adult Dragon), 100x Fervor
 * - Estágio III: 1.000.000.000.000 Fé (1e12) -> Avatar Ancestral (Elder Dragon), 10.000x Fervor
 * - Estágio IV: 1.0e25 Fé (1e25) -> Avatar do Eclipse (Dark Dragon), 100.000.000x Fervor (1e8)
 * - Estágio V: 1.0e30 Fé (1e30) -> Avatar Solar (Light Dragon), 1.0e15x Fervor (1e15)
 */
export const INCARNATION_STAGES: IncarnationStage[] = [
  {
    stage: 1,
    name: 'Avatar Neófito',
    title: 'A Centelha Primordial',
    desc: 'Manifestação primordial da divindade. Canaliza a chama inicial de Fervor no altar sagrado (2e0x Fervor/s).',
    lore: 'Seus primeiros fiéis pensaram em você com tanta força que você ganhou um corpo. Ainda é frágil, mas já arde.',
    cost: 0,
    multiplier: 2
  },
  {
    stage: 2,
    name: 'Avatar Consagrado',
    title: 'O Portador do Fogo Sagrado',
    desc: 'O avatar atinge a maturidade espiritual plena. Multiplica a geração de Fervor por 1e2x.',
    lore: 'Os fiéis já reconhecem seu rosto. Quanto mais nítida a imagem que fazem de você, mais alto o fogo sobe.',
    cost: 2500000,
    multiplier: 100
  },
  {
    stage: 3,
    name: 'Avatar Ancestral',
    title: 'O Ancião da Esfera',
    desc: 'Sabedoria imemorial dos primórdios cósmicos. Multiplica a geração de Fervor por 1e4x.',
    lore: 'Seu corpo lembra eras que nenhum fiel viveu. Os deuses mais novos chamam isso de mito; você chama de memória.',
    cost: 250000000000,
    multiplier: 10000
  },
  {
    stage: 4,
    name: 'Avatar do Eclipse',
    title: 'O Senhor das Sombras Cósmicas',
    desc: 'Fusão com o abismo estelar insondável. Multiplica a geração de Fervor por 1e8x.',
    lore: 'Você se põe entre os panteões e a luz que os sustentava. No escuro, ninguém consegue pensar em outro deus.',
    cost: 1e25,
    multiplier: 1e8
  },
  {
    stage: 5,
    name: 'Avatar Solar',
    title: 'A Entidade da Luz Eterna',
    desc: 'Ascensão solar absoluta. Multiplica a geração de Fervor por 1e15x. Disponível por 1e30 Fé após o Avatar do Eclipse, antes do duelo com Caos Primordial.',
    lore: 'Não resta mente que não pense em você. Corpo e Esfera voltam a ser uma coisa só, e ela brilha por inteiro.',
    cost: 1e30,
    multiplier: 1e15
  }
];
