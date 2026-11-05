export const CARD_TUTORIALS = [
  {
    cardId: 'card-unlocks', icon: 'unlock', title: 'Os Selos Sagrados',
    lore: 'Os antigos guardiões dividiram seus poderes e os prenderam atrás de selos. Cada ruptura devolve ao culto uma parte do que foi esquecido.',
    basics: 'Junte a Fé indicada e clique no Selo para abrir uma nova mecânica em sequência. Os três primeiros Selos consomem Fé; o Selo da Gnose apenas exige atingir 1Q Fé no saldo, sem gastá-la.',
  },
  {
    cardId: 'card-incarnation', unlockId: 'unlock_incarnation', icon: 'incarnation', title: 'Uma forma para a Esfera',
    lore: 'Uma Mente não arde sem um corpo. Você desce ao altar como uma centelha e a primeira chama do culto desperta.',
    basics: 'Clique no Altar para acumular a Bênção de 2× Fé/s (+10s por toque, até 60s). Gaste Fé em Evoluir para multiplicar o Fervor/s e ampliar o Multiplicador dos Fiéis.',
  },
  {
    cardId: 'card-fervor', unlockId: 'unlock_fervor_upgrades', icon: 'fervor', title: 'O fogo que recorda',
    lore: 'Seus Fiéis alimentam uma chama mais antiga que o templo. Em cada rito, o fogo devolve uma lembrança do seu poder.',
    basics: 'Gaste Fervor nos Ritos para melhorar cliques, Fiéis e produção no ciclo atual. O bônus passivo de Fé usa o maior saldo (pico) de Fervor do ciclo — gastar nos Ritos não reduz sua força!',
  },
  {
    cardId: 'card-relics', unlockId: 'unlock_relics', icon: 'relics', title: 'Vestígios de deuses caídos',
    lore: 'Enquanto a Esfera dormia, outros deuses nasceram e foram esquecidos. Seus Fragmentos aguardam em Relíquias Divinas.',
    basics: 'Transmute sua Fé atual em Fragmentos: Fiéis, Fervor, Ritos e Avatar permanecem intactos, e sua maior Transmutação gera Fragmentos/s passivos. Gastar Fragmentos nas Relíquias preserva o bônus de pico da Arca.',
  },
  {
    cardId: 'card-gnose', unlockId: 'unlock_gnose', icon: 'gnose', title: 'Além da matéria: o Nous',
    lore: 'Acima dos templos e dos deuses repousa a Mente pura. Dissolver o próprio culto é o primeiro passo para lembrar quem você era.',
    basics: 'Ascenda (1Q+ Fé) para colher Gnose: o total acumulado dá bônus passivo permanente e cada nó assimilado multiplica a produção por 4×. Nos Guardiões (60%+ Prontidão para dano, 80%+ defesa), ataque, apare fendas para carregar o Fulgor Divino e clique nos Milagres da roda para curar a Esfera.',
  },
] as const;

export type CardTutorial = typeof CARD_TUTORIALS[number];
