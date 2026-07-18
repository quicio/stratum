import { describe, it, expect } from 'vitest';
import { computeBaseline } from '../src/factory/baseline.js';
import type { Genre, Mood } from '../src/domain/types.js';

const hypnoticTechno: Genre = {
  name: 'hypnotic-techno',
  tempo: { min: 136, max: 142, default: 139 },
  defaults: { energy: 0.75, complexity: 0.30, groove: 0.90 },
  rhythm_signature: 'four-on-the-floor',
  harmonic_density: 'low',
};

const deepHouse: Genre = {
  name: 'deep-house',
  tempo: { min: 120, max: 126, default: 124 },
  defaults: { energy: 0.55, complexity: 0.45, groove: 0.70 },
  rhythm_signature: 'four-on-the-floor',
  harmonic_density: 'medium',
};

const arrakis: Mood = {
  name: 'arrakis',
  effects: ['cavern-delay', 'atmospheric-reverb'],
  register: 'bass',
  ornamentation: ['glide'],
  descriptors: ['dry', 'vast', 'mystical'],
  bias: { energy: 0.05, complexity: 0.10, groove: -0.10 },
};

const cathedral: Mood = {
  name: 'cathedral',
  effects: ['long-reverb'],
  register: 'high',
  ornamentation: ['arpeggio', 'shimmer'],
  descriptors: ['luminous', 'vast'],
  bias: { energy: -0.05, complexity: 0.20, groove: -0.20 },
};

describe('computeBaseline', () => {
  it('returns clamped baselines = genre.defaults + mood.bias for energy/complexity/groove', () => {
    const out = computeBaseline(hypnoticTechno, arrakis);
    expect(out.energy).toBeCloseTo(0.80, 5);
    expect(out.complexity).toBeCloseTo(0.40, 5);
    expect(out.groove).toBeCloseTo(0.80, 5);
  });

  it('clamps energy at 1 when bias is high positive', () => {
    const out = computeBaseline({ ...hypnoticTechno, defaults: { ...hypnoticTechno.defaults, energy: 0.95 } }, { ...arrakis, bias: { ...arrakis.bias, energy: 0.5 } });
    expect(out.energy).toBe(1);
  });

  it('clamps groove at 0 when bias pushes it below zero', () => {
    const out = computeBaseline(deepHouse, cathedral);
    expect(out.groove).toBeCloseTo(0.5, 5);
  });

  it('uses genre.tempo.default when present', () => {
    const out = computeBaseline(hypnoticTechno, arrakis);
    expect(out.tempo).toBe(139);
  });

  it('omits tempo when genre.tempo.default is undefined', () => {
    const noDefault: Genre = { ...deepHouse, tempo: { min: 100, max: 110 } };
    const out = computeBaseline(noDefault, arrakis);
    expect(out.tempo).toBeUndefined();
  });
});
