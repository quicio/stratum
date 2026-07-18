import { describe, it, expect } from 'vitest';
import { validateVocabularyPresence, clampTempo, ResolutionError } from '../src/factory/validation.js';
import type { Genre, Scale, Mood } from '../src/domain/types.js';

const scale: Scale = {
  name: 'phrygian',
  intervals: [0, 1, 3, 5, 7, 8, 10],
  character: [],
};

const genre: Genre = {
  name: 'hypnotic-techno',
  tempo: { min: 136, max: 142, default: 139 },
  defaults: { energy: 0.75, complexity: 0.30, groove: 0.90 },
  rhythm_signature: 'four-on-the-floor',
  harmonic_density: 'low',
};

const mood: Mood = {
  name: 'arrakis',
  effects: [],
  register: 'bass',
  ornamentation: [],
  descriptors: [],
  bias: { energy: 0, complexity: 0, groove: 0 },
};

describe('validateVocabularyPresence', () => {
  it('does not throw when scale, genre, mood are all present', () => {
    expect(() => validateVocabularyPresence(scale, genre, mood)).not.toThrow();
  });

  it('throws ResolutionError with unknown-scale when scale is missing', () => {
    expect(() => validateVocabularyPresence(undefined, genre, mood)).toThrow(ResolutionError);
    try {
      validateVocabularyPresence(undefined, genre, mood);
    } catch (e) {
      const err = e as ResolutionError;
      expect(err.field).toBe('scale.name');
      expect(err.reason).toBe('unknown-scale');
    }
  });

  it('throws ResolutionError with unknown-genre when genre is missing', () => {
    expect(() => validateVocabularyPresence(scale, undefined, mood)).toThrow(ResolutionError);
    try {
      validateVocabularyPresence(scale, undefined, mood);
    } catch (e) {
      const err = e as ResolutionError;
      expect(err.field).toBe('genre.name');
      expect(err.reason).toBe('unknown-genre');
    }
  });

  it('throws ResolutionError with unknown-mood when mood is missing', () => {
    expect(() => validateVocabularyPresence(scale, genre, undefined)).toThrow(ResolutionError);
    try {
      validateVocabularyPresence(scale, genre, undefined);
    } catch (e) {
      const err = e as ResolutionError;
      expect(err.field).toBe('mood.name');
      expect(err.reason).toBe('unknown-mood');
    }
  });
});

describe('clampTempo', () => {
  it('returns the original value when inside the range', () => {
    const out = clampTempo(140, genre);
    expect(out.value).toBe(140);
    expect(out.warning).toBeUndefined();
  });

  it('clamps to min and emits a warning when below the range', () => {
    const out = clampTempo(100, genre);
    expect(out.value).toBe(136);
    expect(out.warning).toBeDefined();
    expect(out.warning!.field).toBe('performance.tempo');
    expect(out.warning!.message).toMatch(/clamped from 100 to 136/);
  });

  it('clamps to max and emits a warning when above the range', () => {
    const out = clampTempo(200, genre);
    expect(out.value).toBe(142);
    expect(out.warning).toBeDefined();
    expect(out.warning!.message).toMatch(/clamped from 200 to 142/);
  });
});
