import { afterEach, describe, expect, it, vi } from 'vitest';
import { triggerHaptic } from './haptics';

describe('triggerHaptic', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false and does not vibrate when disabled', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate });

    expect(triggerHaptic(false)).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('calls navigator.vibrate(10) when enabled and supported', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate });

    expect(triggerHaptic(true)).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(10);
  });

  it('returns false gracefully when navigator.vibrate is unavailable', () => {
    vi.stubGlobal('navigator', {});

    expect(triggerHaptic(true)).toBe(false);
  });
});
