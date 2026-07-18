import { describe, it, expect } from 'vitest';
import { resolvePerformanceField } from '../src/factory/resolution.js';

describe('resolvePerformanceField', () => {
  it('returns user value with source=user when present', () => {
    const out = resolvePerformanceField(150, 100);
    expect(out).toEqual({ value: 150, source: 'user' });
  });

  it('falls back to baseline with source=baseline when user is absent', () => {
    const out = resolvePerformanceField(undefined, 140);
    expect(out).toEqual({ value: 140, source: 'baseline' });
  });

  it('treats null user value as absent', () => {
    const out = resolvePerformanceField(null, 140);
    expect(out).toEqual({ value: 140, source: 'baseline' });
  });
});
