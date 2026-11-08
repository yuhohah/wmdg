import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scheduleVisualFrame } from './visualTiming.js';

describe('visual frame scheduling', () => {
  const raf = vi.fn((_cb: FrameRequestCallback) => 7);
  const caf = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    raf.mockClear();
    caf.mockClear();
    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', caf);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('follows the display while on screen', () => {
    scheduleVisualFrame(true, () => {});
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it('does not wake the display while off screen, but keeps ticking', () => {
    const frame = vi.fn();
    scheduleVisualFrame(false, frame);
    expect(raf).not.toHaveBeenCalled();
    expect(frame).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(frame).toHaveBeenCalledTimes(1);
    expect(frame.mock.calls[0][0]).toBeGreaterThanOrEqual(0);
  });

  it('cancels either kind of frame', () => {
    scheduleVisualFrame(true, () => {})();
    expect(caf).toHaveBeenCalledWith(7);
    const frame = vi.fn();
    scheduleVisualFrame(false, frame)();
    vi.advanceTimersByTime(500);
    expect(frame).not.toHaveBeenCalled();
  });
});
