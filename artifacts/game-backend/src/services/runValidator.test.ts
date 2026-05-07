// src/services/runValidator.test.ts

import { describe, it, expect } from 'vitest';
import { validateRun } from './runValidator.js';

const baseRun = {
  seed: 'cafef00d',
  startedAt: 1_723_000_000_000,
  endedAt:   1_723_000_090_000,    // 90s
  distanceCm: 150_000,              // 1500 m
  coins: 200,
  score: 9000,
  comboMax: 8,
  nearMisses: 30,
  causeOfDeath: 'crash' as const,
  biomePath: ['cyber_city'],
  jetpackTimeMs: 12_000,
  clientVersion: '1.0.0',
  device: 'iPhone16,1',
  powerUpsUsed: {},
};

describe('runValidator', () => {
  it('accepts a plausible run within tolerance', async () => {
    const r = await validateRun(baseRun);
    expect(r.valid).toBe(true);
  });

  it('rejects impossibly fast runs', async () => {
    const cheating = { ...baseRun, distanceCm: 5_000_000 }; // 50 km in 90 s
    const r = await validateRun(cheating);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('distance_exceeds_max');
  });

  it('rejects coin overflow vs distance', async () => {
    const cheating = { ...baseRun, coins: 50_000 };
    const r = await validateRun(cheating);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('too_many_coins');
  });

  it('rejects score that does not match canonical', async () => {
    const cheating = { ...baseRun, score: 999_999 };
    const r = await validateRun(cheating);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('score_mismatch');
  });
});
