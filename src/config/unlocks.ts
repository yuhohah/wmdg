import type { MechanicUnlock } from '../types.js';

export const initialUnlocks: MechanicUnlock[] = [
  {
    id: 'unlock_incarnation',
    name: 'Selo da Encarnação',
    desc: 'Rompe o selo que impede você de ter um corpo. Acende o Fervor (+1/s) e abre a aba Encarnação.',
    lore: 'Uma Mente não arde sem um corpo. Rompido o primeiro selo, você desce ao altar e acende a chama do culto.',
    symbol: '',
    cost: 200,
    costCurrency: 'faith',
    unlocked: false,
    tabId: 'tab-incarnation',
    tabName: 'Encarnação'
  },
  {
    id: 'unlock_fervor_upgrades',
    name: 'Selo do Fervor',
    desc: 'Libera os Ritos de Fervor: gaste Fervor em melhorias permanentes para cliques, fiéis e para o próprio Fervor.',
    lore: 'Atrás deste selo está o fogo que seus fiéis alimentam. Quanto mais ele arde, mais você se lembra do que já foi.',
    symbol: '',
    cost: 5000,
    costCurrency: 'faith',
    unlocked: false,
    tabId: 'tab-fervor',
    tabName: 'Fervor',
    prerequisiteId: 'unlock_incarnation'
  },
  {
    id: 'unlock_relics',
    name: 'Selo das Relíquias',
    desc: 'Libera a Transmutação: troque toda a sua Fé por Fragmentos e use-os para restaurar relíquias de deuses caídos. Abre a aba Relíquias.',
    lore: 'Enquanto você dormia, deuses nasceram e morreram esquecidos. Este selo guarda o que restou deles.',
    symbol: '',
    cost: 20000000,
    costCurrency: 'faith',
    unlocked: false,
    tabId: 'tab-relics',
    tabName: 'Relíquias',
    prerequisiteId: 'unlock_fervor_upgrades'
  },
  {
    id: 'unlock_pantheon',
    name: 'Selo do Panteão',
    desc: 'Ao restaurar relíquias ancestrais e quebrar as leis mortais, sua ascensão atrai a fúria dos Deuses Cósmicos que disputam a primazia do éter. Desbloqueia a aba Panteão e a Teomaquia.',
    lore: 'Os ecos das suas transmutações rasgaram o firmamento estelar. Seis divindades titânicas acordam e exigem a sua ruína ou a sua consagração absoluta.',
    symbol: '',
    cost: 50000000,
    costCurrency: 'faith',
    unlocked: false,
    tabId: 'tab-pantheon',
    tabName: 'Panteão',
    prerequisiteId: 'unlock_relics'
  },
  {
    id: 'unlock_gnose',
    name: 'Selo da Gnose',
    desc: 'Libera a Ascensão Gnóstica: dissolva seu culto terreno a partir de 1Q de Fé para colher Gnose e desbloquear a Árvore Hermética permanente. Abre a Câmara da Gnose.',
    lore: 'Acima da matéria e das relíquias dos deuses caídos repousa o Nous puro. Quem dissolve o próprio templo renasce na geometria eterna da Esfera.',
    symbol: '',
    cost: 1e15,
    costCurrency: 'faith',
    unlocked: false,
    tabId: 'tab-gnose',
    tabName: 'Gnose',
    prerequisiteId: 'unlock_relics'
  }
];
