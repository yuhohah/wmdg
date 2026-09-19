import type { BuyableItem } from '../types.js';

export const initialFollowers: BuyableItem[] = [
  {
    id: 'f_devotee',
    name: 'Fiel Devoto',
    desc: 'Seguidor com túnica e capuz que entoa preces ininterruptas à Esfera Divina.',
    lore: 'Reunidos em círculos sagrados à luz trêmula das velas, os devotos canalizam sua energia espiritual diretamente para a Esfera. Quanto maior o círculo de adoradores, mais intensa se torna a ressonância de fé cósmica.',
    symbol: '🕯️',
    baseCost: 20,
    costMultiplier: 1.10,
    benefitText: '+1 Fé / seg por fiel',
    count: 0,
    baseEffect: 1,
    effectType: 'fps'
  }
];
