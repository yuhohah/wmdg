import type { RestoredTier } from '../features/church/churchScene.js';

export interface RestorationNotice {
  title: string;
  desc: string;
  icon: string;
}

/** PT-BR notification shown when the church reaches each tier. Tier 0 is the starting ruin, so it has none. */
export const RESTORATION_NOTICES: Record<RestoredTier, RestorationNotice> = {
  1: { title: 'Os escombros foram retirados', desc: 'Um altar improvisado agora sustenta a Esfera.', icon: '🪨' },
  2: { title: 'O telhado foi restaurado', desc: 'As paredes estão de pé e as primeiras velas foram acesas.', icon: '🕯️' },
  3: { title: 'A igreja foi restaurada', desc: 'O campanário se ergue, os vitrais brilham e os estandartes tremulam.', icon: '🔔' }
};
