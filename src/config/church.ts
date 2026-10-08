import type { RestoredTier } from '../features/church/churchScene.js';

/** A named notification for something new in the church: a restored tier or an unlocked detail. */
export interface ChurchNotice {
  title: string;
  desc: string;
  icon: string;
}

/** PT-BR notification shown when the church reaches each tier. Tier 0 is the starting ruin, so it has none. */
export const RESTORATION_NOTICES: Record<RestoredTier, ChurchNotice> = {
  1: { title: 'Os escombros foram retirados', desc: 'Um altar improvisado agora sustenta a Esfera.', icon: '🪨' },
  2: { title: 'O telhado foi restaurado', desc: 'As paredes estão de pé e as primeiras velas foram acesas.', icon: '🕯️' },
  3: { title: 'A igreja foi restaurada', desc: 'O campanário se ergue, os vitrais brilham e os estandartes tremulam.', icon: '🔔' }
};

export type ChurchDetail = 'torches' | 'pews' | 'garden' | 'banner' | 'statue';

/**
 * Small props that appear between Selo tiers as the follower count grows, in threshold order.
 * Placeholder thresholds, to be tuned against the progression balance doc.
 */
export interface ChurchDetailUnlock {
  detail: ChurchDetail;
  followers: number;
  notice: ChurchNotice;
}

export const CHURCH_DETAILS: readonly ChurchDetailUnlock[] = [
  { detail: 'torches', followers: 10, notice: { title: 'Tochas foram acesas', desc: 'Os fiéis mantêm o fogo vivo diante da igreja.', icon: '🔥' } },
  { detail: 'pews', followers: 25, notice: { title: 'Bancos foram erguidos', desc: 'Os fiéis já têm onde se sentar para rezar.', icon: '🪑' } },
  { detail: 'garden', followers: 50, notice: { title: 'Um jardim floresceu', desc: 'Mãos devotas cultivam flores ao redor da igreja.', icon: '🌷' } },
  { detail: 'banner', followers: 100, notice: { title: 'O estandarte do culto foi hasteado', desc: 'Os fiéis marcham sob o mesmo símbolo.', icon: '🚩' } },
  { detail: 'statue', followers: 250, notice: { title: 'Uma estátua da Esfera foi erguida', desc: 'Pedra esculpida em honra ao deus selado.', icon: '🗿' } }
];
