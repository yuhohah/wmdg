export interface IncarnationStage {
  stage: number;
  name: string;
  title: string;
  desc: string;
  lore: string;
  cost: number;
  multiplier: number;
}

export const INCARNATION_STAGES: IncarnationStage[] = [
  {
    stage: 1,
    name: 'Avatar Neófito',
    title: 'A Centelha Primordial',
    desc: 'A primeira manifestação viva da Esfera no templo mortal. Canaliza a chama inicial de +1.0 Fervor / seg.',
    lore: 'Nascido da devoção dos fiéis reunidos, este avatar etéreo ancora a essência direta dos céus no altar sagrado.',
    cost: 0,
    multiplier: 1
  },
  {
    stage: 2,
    name: 'Avatar Consagrado',
    title: 'O Portador do Fogo Sagrado',
    desc: 'O avatar consagra a chama dos devotos. Multiplica a geração de Fervor em 2x (+2.0 Fervor/s).',
    lore: 'Suas vestes ganham filigranas prateadas e seus olhos brilham com a certeza inabalável da fé.',
    cost: 800,
    multiplier: 2
  },
  {
    stage: 3,
    name: 'Avatar Iluminado',
    title: 'A Tocha da Revelação',
    desc: 'A luz divina irrompe do capuz místico. Multiplica a geração de Fervor em 4x (+4.0 Fervor/s).',
    lore: 'Uma auréola dourada circular surge ao redor de sua fronte, aquecendo todo o santuário.',
    cost: 3500,
    multiplier: 4
  },
  {
    stage: 4,
    name: 'Avatar Ascendente',
    title: 'O Portador Solar',
    desc: 'Conexão profunda com o cosmos. Multiplica a geração de Fervor em 10x.',
    lore: 'O manto cerimonial cintila com fios dourados e runas solares orbitam seu corpo sagrado.',
    cost: 20000,
    multiplier: 10
  },
  {
    stage: 5,
    name: 'Avatar Celestial',
    title: 'O Sacerdote da Esfera',
    desc: 'Manifestação gloriosa dos céus. Multiplica a geração de Fervor em 25x.',
    lore: 'O calor de sua devoção transcende os limites mortais, infundindo vigor absoluto ao culto.',
    cost: 150000,
    multiplier: 25
  },
  {
    stage: 6,
    name: 'Avatar Ancestral',
    title: 'O Ancião da Esfera',
    desc: 'Sabedoria milenar do cosmos primordial. Multiplica a geração de Fervor em 100x.',
    lore: 'Repousando no epicentro do santuário, sua respiração cósmica incendeia o êxtase divino.',
    cost: 2000000,
    multiplier: 100
  },
  {
    stage: 7,
    name: 'Avatar Cósmico',
    title: 'A Entidade Eterna',
    desc: 'Fusão total com a Esfera Cósmica. Multiplica a geração de Fervor em 500x!',
    lore: 'Uma presença indescritível que ecoa através de todos os planos cósmicos.',
    cost: 50000000,
    multiplier: 500
  }
];

