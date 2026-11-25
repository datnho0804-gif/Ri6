import { describe, expect, it } from 'vitest';
import { computeEffectivePending } from './useGitHubSync';

describe('computeEffectivePending (T04 SW Background Sync baseline)', () => {
  it('subtracts SW-acknowledged pending changes cleanly without going negative', () => {
    expect(computeEffectivePending(0, 0)).toBe(0);
    expect(computeEffectivePending(2, 0)).toBe(2);
    // SW Background Sync completed when scheduler had 2 pending changes
    expect(computeEffectivePending(2, 2)).toBe(0);
    // User then makes 1 new local change -> scheduler has 3, effective is 1
    expect(computeEffectivePending(3, 2)).toBe(1);
    // If scheduler resets to 0 before baseline clears, never goes negative
    expect(computeEffectivePending(0, 2)).toBe(0);
  });
});
