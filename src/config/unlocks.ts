import type { MechanicUnlock } from '../types.js';

export const initialUnlocks: MechanicUnlock[] = [
  {
    id: 'unlock_incarnation',
    name: 'Despertar Incarnation',
    desc: 'Convoque a Encarnação Sagrada da Esfera Cósmica para habitar o altar sagrado. Desperta o Fervor (+1.0/s) e revela a nova aba Incarnation.',
    lore: 'Através da união espiritual dos primeiros fiéis, a divindade ganha forma corporal tangível. Sua presença desperta a chama viva do culto.',
    symbol: '',
    cost: 200,
    costCurrency: 'faith',
    unlocked: false,
    tabId: 'tab-incarnation',
    tabName: 'Incarnation'
  },
  {
    id: 'unlock_fervor_upgrades',
    name: 'Ritos de Fervor',
    desc: 'Desbloqueie a aba e a árvore de Upgrades de Fervor para canalizar a chama sagrada em bênçãos permanentes de cliques, devotos e multiplicadores.',
    lore: 'Com a presença viva da Encarnação, os sacerdotes consagram os manuscritos sagrados de aprimoramento de fervor.',
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
    name: 'Desbloquear Relíquias',
    desc: 'Desperte o relicário ancestral e revele a aba de Relíquias mitológicas para consagrar Fé em artefatos de poder imensurável.',
    lore: 'Antigos mestres guardavam relicários imbuídos com a matéria primordial da Esfera, permitindo converter a devoção terrena em essência pura.',
    symbol: '',
    cost: 20000000,
    costCurrency: 'faith',
    unlocked: false,
    tabId: 'tab-relics',
    tabName: 'Relíquias',
    prerequisiteId: 'unlock_fervor_upgrades'
  }
];
