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
  }
];
