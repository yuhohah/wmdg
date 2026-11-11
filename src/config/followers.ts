import type { BuyableItem } from '../types.js';

export const initialFollowers: BuyableItem[] = [
  {
    id: 'f_devotee',
    name: 'Fiel Devoto',
    desc: 'Ora sem parar. Cada fiel gera +1 Fé/s.',
    lore: 'Encapuzados, reunidos à luz de velas, seus fiéis não pedem nada: apenas pensam em você. E, para uma Mente, ser pensada é existir.',
    symbol: '',
    baseCost: 20,
    costMultiplier: 1.10,
    benefitText: '+1 Fé/s por fiel',
    count: 0,
    baseEffect: 1,
    effectType: 'fps'
  }
];
