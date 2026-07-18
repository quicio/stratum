import { describe, it, expect } from 'vitest';
import {
  ScaleSchema,
  GenreSchema,
  MoodSchema,
  type PerformanceAxis,
} from '../src/domain/types.js';

describe('ScaleSchema', () => {
  it('accepts the phrygian seed YAML shape', () => {
    const result = ScaleSchema.safeParse({
      name: 'phrygian',
      intervals: [0, 1, 3, 5, 7, 8, 10],
      character: ['dark', 'tense', 'ritual'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a scale whose name has uppercase characters', () => {
    const result = ScaleSchema.safeParse({
      name: 'Phrygian',
      intervals: [0, 1, 3, 5, 7, 8, 10],
      character: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a scale whose intervals list has wrong length', () => {
    const result = ScaleSchema.safeParse({
      name: 'phrygian',
      intervals: [0, 1, 3, 5, 7, 8],
      character: [],
    });
    expect(result.success).toBe(false);
  });

  it('defaults character to an empty array when missing', () => {
    const result = ScaleSchema.safeParse({
      name: 'phrygian',
      intervals: [0, 1, 3, 5, 7, 8, 10],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.character).toEqual([]);
    }
  });
});

describe('GenreSchema', () => {
  it('accepts the hypnotic-techno seed YAML shape', () => {
    const result = GenreSchema.safeParse({
      name: 'hypnotic-techno',
      tempo: { min: 136, max: 142, default: 139 },
      defaults: { energy: 0.75, complexity: 0.30, groove: 0.90 },
      rhythm_signature: 'four-on-the-floor',
      harmonic_density: 'low',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a tempo without a default field', () => {
    const result = GenreSchema.safeParse({
      name: 'minimal-techno',
      tempo: { min: 120, max: 130 },
      defaults: { energy: 0.50, complexity: 0.40, groove: 0.80 },
      rhythm_signature: 'four-on-the-floor',
      harmonic_density: 'low',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when tempo.min > tempo.max', () => {
    const result = GenreSchema.safeParse({
      name: 'bad',
      tempo: { min: 140, max: 130 },
      defaults: { energy: 0.50, complexity: 0.40, groove: 0.80 },
      rhythm_signature: 'four-on-the-floor',
      harmonic_density: 'low',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when tempo.default is outside [min, max]', () => {
    const result = GenreSchema.safeParse({
      name: 'bad',
      tempo: { min: 130, max: 140, default: 150 },
      defaults: { energy: 0.50, complexity: 0.40, groove: 0.80 },
      rhythm_signature: 'four-on-the-floor',
      harmonic_density: 'low',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown harmonic_density values', () => {
    const result = GenreSchema.safeParse({
      name: 'bad',
      tempo: { min: 120, max: 130 },
      defaults: { energy: 0.50, complexity: 0.40, groove: 0.80 },
      rhythm_signature: 'four-on-the-floor',
      harmonic_density: 'very-high',
    });
    expect(result.success).toBe(false);
  });

  it('rejects defaults outside [0, 1]', () => {
    const result = GenreSchema.safeParse({
      name: 'bad',
      tempo: { min: 120, max: 130 },
      defaults: { energy: 1.5, complexity: 0.40, groove: 0.80 },
      rhythm_signature: 'four-on-the-floor',
      harmonic_density: 'low',
    });
    expect(result.success).toBe(false);
  });
});

describe('MoodSchema', () => {
  it('accepts the arrakis seed YAML shape', () => {
    const result = MoodSchema.safeParse({
      name: 'arrakis',
      effects: ['cavern-delay', 'atmospheric-reverb'],
      register: 'bass',
      ornamentation: ['glide'],
      descriptors: ['dry', 'vast', 'mystical'],
      bias: { energy: 0.05, complexity: 0.10, groove: -0.10 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects bias outside [-1, 1]', () => {
    const result = MoodSchema.safeParse({
      name: 'bad',
      effects: [],
      register: 'bass',
      ornamentation: [],
      descriptors: [],
      bias: { energy: 2, complexity: 0, groove: 0 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown register values', () => {
    const result = MoodSchema.safeParse({
      name: 'bad',
      effects: [],
      register: 'sub-bass',
      ornamentation: [],
      descriptors: [],
      bias: { energy: 0, complexity: 0, groove: 0 },
    });
    expect(result.success).toBe(false);
  });
});

describe('PerformanceAxis', () => {
  it('enumerates the four performance axes from spec-0001', () => {
    const expected: readonly PerformanceAxis[] = ['tempo', 'energy', 'complexity', 'groove'] as const;
    expect(expected).toEqual(['tempo', 'energy', 'complexity', 'groove']);
  });
});
