import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EndingRitual, RITUAL_CUES, ritualMoment } from './EndingRitual.js';

describe('conclusion ritual choreography', () => {
  it('gathers all actors before invocation and keeps them through the credits', () => {
    expect(ritualMoment(0)).toMatchObject({ phase: 'gathering', arrival: 0, disappearance: 0 });
    expect(ritualMoment(RITUAL_CUES.invocation)).toMatchObject({ phase: 'invocation', arrival: 1 });
    expect(ritualMoment(RITUAL_CUES.gratitude)).toMatchObject({ phase: 'gratitude', seal: 1, disappearance: 0 });
    expect(ritualMoment(RITUAL_CUES.vanishing - .01).disappearance).toBe(0);
  });

  it('removes every actor and the seal, leaves a silent interval, then reveals the choice', () => {
    expect(ritualMoment(25.5)).toMatchObject({ phase: 'vanishing', disappearance: .5 });
    expect(ritualMoment(RITUAL_CUES.silence)).toMatchObject({ phase: 'silence', disappearance: 1 });
    expect(ritualMoment(RITUAL_CUES.complete - .01).phase).toBe('silence');
    expect(ritualMoment(RITUAL_CUES.complete)).toMatchObject({ phase: 'complete', disappearance: 1 });
  });
});


describe('ritual with stalled image loading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('Image', class { src = ''; decode = () => new Promise<void>(() => {}); });
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0 }) });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('can reveal the choice immediately even if no image finishes decoding', () => {
    const phase = vi.fn();
    const ritual = new EndingRitual(document.createElement('canvas'), phase);
    ritual.finish();
    expect(phase).toHaveBeenCalledWith('complete');
    vi.advanceTimersByTime(10000);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('starts with available artwork after the loading deadline', () => {
    const ritual = new EndingRitual(document.createElement('canvas'), vi.fn());
    vi.advanceTimersByTime(5000);
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    ritual.stop();
  });
});
