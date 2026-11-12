export const CARD_TUTORIALS = [
  {
    cardId: 'card-altar-sphere', seenKey: 'guidance-settings', requiresIntro: true,
    icon: 'gear', title: 'Dicas no seu ritmo',
    lore: 'Você pode jogar com ou sem as orientações.',
    basics: 'Para desativar as dicas e os tutoriais, abra Configurações na engrenagem do canto superior direito e marque “Ocultar dicas e tutoriais”. Desmarque para voltar a vê-los.',
  },
  {
    cardId: 'card-unlocks', icon: 'unlock', title: 'Os Selos Sagrados',
    lore: 'Os antigos guardiões repartiram o poder da Esfera e o prenderam atrás de selos. Cada ruptura devolve ao culto uma parte do que foi esquecido.',
    basics: 'Gaste a Fé indicada para romper cada Selo e liberar uma nova mecânica.',
  },
  {
    cardId: 'card-incarnation', unlockId: 'unlock_incarnation', icon: 'incarnation', title: 'Uma forma para a Esfera',
    lore: 'Uma Mente não arde sem um corpo. Você desce ao altar como uma centelha e a primeira chama do culto desperta.',
    basics: 'Fervor: agora ele é produzido sozinho e fortalece sua Fé. Bênção: clique no Altar para somar 3s (até 60s) de Fé/s dobrada. Evoluir: gasta Fé e aumenta muito o Fervor/s e o Multiplicador dos Fiéis.',
  },
  {
    cardId: 'card-fervor', unlockId: 'unlock_fervor_upgrades', icon: 'fervor', title: 'O fogo que recorda',
    lore: 'Seu novo corpo despertou uma chama mais antiga que o templo. Em cada rito, o fogo devolve uma lembrança do seu poder.',
    basics: 'Gaste Fervor nos Ritos para fortalecer cliques, Fiéis e a produção de Fervor. Pode gastar sem medo: o bônus do Fervor na Fé usa o maior saldo que você já alcançou.',
  },
  {
    cardId: 'card-relics', unlockId: 'unlock_relics', icon: 'gem', title: 'Vestígios de deuses caídos',
    lore: 'Enquanto a Esfera dormia, outros deuses nasceram e foram esquecidos. Seus Fragmentos ainda guardam poder, à espera de quem restaure suas relíquias.',
    basics: 'Transmutar troca toda a sua Fé por Fragmentos, sem afetar o resto. Sua melhor Transmutação aumenta seus Fragmentos/s. Gaste-os em Relíquias para fortalecer o culto.',
  },
  {
    cardId: 'card-gnose', unlockId: 'unlock_gnose', icon: 'gnose', title: 'Gnose: poder que permanece',
    lore: 'A ascensão permite recomeçar o culto com mais poder. A Gnose e as melhorias da Árvore Hermética permanecem entre as ascensões.',
    basics: 'Quando reunir Fé suficiente, você poderá ascender para ganhar Gnose. Quanto mais Fé tiver, maior será a recompensa. Use a Gnose na Árvore Hermética para fortalecer sua produção e desbloquear automações.',
  },
  {
    cardId: 'card-gnose', seenKey: 'guardians', unlockId: 'unlock_gnose', requiresBoss: 'boss_anubis', targetSelector: '.gnose-tier-section[data-tier="2"] .gnose-tier-seal', icon: 'swords', title: 'Os Guardiões dos panteões',
    lore: 'Os Guardiões ainda reinam sobre os panteões e temem o que a Esfera começa a lembrar. Para retomar o que é seu, será preciso enfrentá-los.',
    basics: 'Prontidão: abaixo de 60% você não causa dano; abaixo de 80%, um golpe não aparado destrói a Esfera. Na luta: clique no Guardião para atacar, nas fendas para aparar e nos Milagres para curar; atacar e aparar carregam o Fulgor Divino.',
  },
] as const;

export type CardTutorial = typeof CARD_TUTORIALS[number];

// Saved in seenCardTutorials; defaults to cardId so existing saves stay valid
export function cardTutorialKey(tutorial: CardTutorial): string {
  return 'seenKey' in tutorial ? tutorial.seenKey : tutorial.cardId;
}
