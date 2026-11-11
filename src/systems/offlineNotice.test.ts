import { describe, expect, it } from 'vitest';
import { buildOfflineNotice } from './elapsedTime.js';

const gains = { faithGained: 4980, fervorGained: 3.7, relicGained: 0 };

describe('offline notice', () => {
  it('stays silent for absences shorter than a minute', () => {
    expect(buildOfflineNotice(59, gains)).toBeUndefined();
  });

  it('stays silent when nothing was gained', () => {
    expect(buildOfflineNotice(600, { faithGained: 0, fervorGained: 0, relicGained: 0 })).toBeUndefined();
  });

  it('summarizes only the resources gained during the absence', () => {
    const notice = buildOfflineNotice(60, gains);
    expect(notice?.title).toBe('VIGÍLIA SAGRADA (1m)');
    expect(notice?.desc).toContain('+4,98K Fé, +3,7 Fervor.');
    expect(notice?.desc).not.toContain('Fragmentos');
  });

  it('switches to hours from one hour on', () => {
    expect(buildOfflineNotice(5400, gains)?.title).toBe('VIGÍLIA SAGRADA (1,5h)');
  });
});
