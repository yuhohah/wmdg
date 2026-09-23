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
    desc: 'Canaliza o Fervor para multiplicar a Fé dos Fiéis com progressão logarítmica (1x Estágio • Base: 150 Fervor).',
    lore: 'Nascido da devoção dos fiéis reunidos, este avatar etéreo ancora a essência direta dos céus no altar sagrado.',
    cost: 0,
    multiplier: 1
  },
  {
    stage: 2,
    name: 'Avatar Consagrado',
    title: 'O Portador do Fogo Sagrado',
    desc: 'O avatar consagra a chama dos devotos. Dobra o fator de escala do Fervor sobre os Fiéis (2x Estágio).',
    lore: 'Suas vestes ganham filigranas prateadas e seus olhos brilham com a certeza inabalável da fé.',
    cost: 800,
    multiplier: 2
  },
  {
    stage: 3,
    name: 'Avatar Iluminado',
    title: 'A Tocha da Revelação',
    desc: 'A luz divina irrompe do capuz místico. Triplica o fator de escala do Fervor sobre os Fiéis (3x Estágio).',
    lore: 'Uma auréola dourada circular surge ao redor de sua fronte, aquecendo todo o santuário.',
    cost: 3500,
    multiplier: 3
  },
  {
    stage: 4,
    name: 'Avatar Ascendente',
    title: 'O Portador Solar',
    desc: 'Conexão profunda com o cosmos. Quadruplica o fator de escala do Fervor sobre os Fiéis (4x Estágio).',
    lore: 'O manto cerimonial cintila com fios dourados e runas solares orbitam seu corpo sagrado.',
    cost: 20000,
    multiplier: 4
  },
  {
    stage: 5,
    name: 'Avatar Celestial',
    title: 'O Sacerdote da Esfera',
    desc: 'Manifestação gloriosa dos céus. Quintuplica o fator de escala do Fervor sobre os Fiéis (5x Estágio).',
    lore: 'O calor de sua devoção transcende os limites mortais, infundindo vigor absoluto ao culto.',
    cost: 150000,
    multiplier: 5
  },
  {
    stage: 6,
    name: 'Avatar Ancestral',
    title: 'O Ancião da Esfera',
    desc: 'Sabedoria milenar do cosmos primordial. Eleva o fator de escala do Fervor sobre os Fiéis para 6x (6x Estágio).',
    lore: 'Repousando no epicentro do santuário, sua respiração cósmica incendeia o êxtase divino.',
    cost: 2000000,
    multiplier: 6
  },
  {
    stage: 7,
    name: 'Avatar Cósmico',
    title: 'A Entidade Eterna',
    desc: 'Fusão total com a Esfera Cósmica. Eleva o fator de escala do Fervor sobre os Fiéis para o ápice (7x Estágio)!',
    lore: 'Uma presença indescritível que ecoa através de todos os planos cósmicos.',
    cost: 50000000,
    multiplier: 7
  }
];

