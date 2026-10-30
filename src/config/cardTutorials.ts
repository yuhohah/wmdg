export const CARD_TUTORIALS = [
  {
    cardId: 'card-unlocks', icon: 'unlock', title: 'Os Selos Sagrados',
    lore: 'Os antigos guardiões dividiram seus poderes e os prenderam atrás de selos. Cada ruptura devolve ao culto uma parte do que foi esquecido.',
    basics: 'Junte a Fé indicada e clique no Selo para abrir uma nova mecânica. Os primeiros Selos gastam Fé; o da Gnose apenas exige atingir o valor.',
  },
  {
    cardId: 'card-incarnation', unlockId: 'unlock_incarnation', icon: 'incarnation', title: 'Uma forma para a Esfera',
    lore: 'Uma Mente não arde sem um corpo. Você desce ao altar como uma centelha e a primeira chama do culto desperta.',
    basics: 'Clique no altar para carregar a Bênção de 2× Fé. Gaste Fé em Evoluir para fortalecer a Encarnação, o Fervor e seus Fiéis.',
  },
  {
    cardId: 'card-fervor', unlockId: 'unlock_fervor_upgrades', icon: 'fervor', title: 'O fogo que recorda',
    lore: 'Seus Fiéis alimentam uma chama mais antiga que o templo. Em cada rito, o fogo devolve uma lembrança do seu poder.',
    basics: 'Gaste Fervor nos Ritos para melhorar cliques, Fiéis e produção. Essas melhorias duram o ciclo atual; a Ascensão pela Gnose reinicia os Ritos.',
  },
  {
    cardId: 'card-relics', unlockId: 'unlock_relics', icon: 'relics', title: 'Vestígios de deuses caídos',
    lore: 'Enquanto a Esfera dormia, outros deuses nasceram e foram esquecidos. Seus Fragmentos aguardam no vaso alquímico.',
    basics: 'Transmute toda a Fé acumulada em Fragmentos e use-os para restaurar Relíquias. Seus Fiéis continuam produzindo. Confira o efeito e o custo de cada restauração.',
  },
  {
    cardId: 'card-gnose', unlockId: 'unlock_gnose', icon: 'gnose', title: 'Além da matéria: o Nous',
    lore: 'Acima dos templos e dos deuses repousa a Mente pura. Dissolver o próprio culto é o primeiro passo para lembrar quem você era.',
    basics: 'Ascenda para ganhar Gnose e reiniciar o culto terreno. Os nós assimilados são permanentes e cada um multiplica a produção por 4. Vença os guardiões para abrir novos tiers.',
  },
] as const;

export type CardTutorial = typeof CARD_TUTORIALS[number];
