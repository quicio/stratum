import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VocabularyRepository } from '../src/repository/vocabulary-repository.js';
import {
  SignatureFactory,
  type DirectComposition,
  type IntentComposition,
  type IntentResolver,
  ResolutionError,
} from '../src/factory/signature-factory.js';

const SEED_ROOT = resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../../vocabulary',
);

let vocabulary: VocabularyRepository;
let passThroughResolver: IntentResolver;

beforeAll(async () => {
  vocabulary = await VocabularyRepository.load(SEED_ROOT);
  passThroughResolver = async (_intent, partial) => partial;
});

describe('SignatureFactory.direct', () => {
  it('builds a signature with every source=user when all fields are supplied', () => {
    const factory = new SignatureFactory(vocabulary, passThroughResolver);
    const input: DirectComposition = {
      scale: { name: 'phrygian', root_pitch_class: 2 },
      genre: { name: 'hypnotic-techno' },
      mood: { name: 'arrakis' },
      performance: { tempo: 140, energy: 0.85, complexity: 0.40, groove: 0.95 },
    };
    const { signature, warnings } = factory.direct(input);
    expect(warnings).toEqual([]);

    expect(signature.scale.name).toEqual({ value: 'phrygian', source: 'user' });
    expect(signature.scale.root_pitch_class).toEqual({ value: 2, source: 'user' });
    expect(signature.genre.name).toEqual({ value: 'hypnotic-techno', source: 'user' });
    expect(signature.mood.name).toEqual({ value: 'arrakis', source: 'user' });
    expect(signature.performance.tempo).toEqual({ value: 140, source: 'user' });
    expect(signature.performance.energy).toEqual({ value: 0.85, source: 'user' });
    expect(signature.performance.complexity).toEqual({ value: 0.40, source: 'user' });
    expect(signature.performance.groove).toEqual({ value: 0.95, source: 'user' });
  });

  it('falls back to baseline for performance fields not supplied by the user', () => {
    const factory = new SignatureFactory(vocabulary, passThroughResolver);
    const input: DirectComposition = {
      scale: { name: 'phrygian', root_pitch_class: 2 },
      genre: { name: 'hypnotic-techno' },
      mood: { name: 'arrakis' },
    };
    const { signature, warnings } = factory.direct(input);
    expect(warnings).toEqual([]);
    expect(signature.performance.tempo.source).toBe('baseline');
    expect(signature.performance.tempo.value).toBe(139);
    expect(signature.performance.energy.source).toBe('baseline');
    expect(signature.performance.complexity.source).toBe('baseline');
    expect(signature.performance.groove.source).toBe('baseline');
  });

  it('clamps tempo outside the genre range and emits a warning', () => {
    const factory = new SignatureFactory(vocabulary, passThroughResolver);
    const input: DirectComposition = {
      scale: { name: 'phrygian', root_pitch_class: 2 },
      genre: { name: 'hypnotic-techno' },
      mood: { name: 'arrakis' },
      performance: { tempo: 200 },
    };
    const { signature, warnings } = factory.direct(input);
    expect(signature.performance.tempo.value).toBe(142);
    expect(signature.performance.tempo.source).toBe('user');
    expect(warnings.length).toBe(1);
    expect(warnings[0]!.field).toBe('performance.tempo');
    expect(warnings[0]!.message).toMatch(/clamped from 200 to 142/);
  });

  it('does not invent a baseline when genre.tempo.default is undefined', () => {
    const factory = new SignatureFactory(vocabulary, passThroughResolver);
    const input: DirectComposition = {
      scale: { name: 'phrygian', root_pitch_class: 2 },
      genre: { name: 'deep-house' },
      mood: { name: 'arrakis' },
    };
    const { signature } = factory.direct(input);
    expect(signature.performance.tempo.value).toBe(124);
    expect(signature.performance.tempo.source).toBe('baseline');
  });

  it('throws ResolutionError with reason unknown-scale for unknown scale name', () => {
    const factory = new SignatureFactory(vocabulary, passThroughResolver);
    try {
      factory.direct({
        scale: { name: 'locrian', root_pitch_class: 0 },
        genre: { name: 'hypnotic-techno' },
        mood: { name: 'arrakis' },
      });
      expect.fail('expected ResolutionError');
    } catch (e) {
      expect(e).toBeInstanceOf(ResolutionError);
      const err = e as ResolutionError;
      expect(err.field).toBe('scale.name');
      expect(err.reason).toBe('unknown-scale');
    }
  });

  it('throws ResolutionError with reason unknown-genre for unknown genre name', () => {
    const factory = new SignatureFactory(vocabulary, passThroughResolver);
    try {
      factory.direct({
        scale: { name: 'phrygian', root_pitch_class: 2 },
        genre: { name: 'dnb' },
        mood: { name: 'arrakis' },
      });
      expect.fail('expected ResolutionError');
    } catch (e) {
      expect(e).toBeInstanceOf(ResolutionError);
      const err = e as ResolutionError;
      expect(err.field).toBe('genre.name');
      expect(err.reason).toBe('unknown-genre');
    }
  });

  it('throws ResolutionError with reason unknown-mood for unknown mood name', () => {
    const factory = new SignatureFactory(vocabulary, passThroughResolver);
    try {
      factory.direct({
        scale: { name: 'phrygian', root_pitch_class: 2 },
        genre: { name: 'hypnotic-techno' },
        mood: { name: 'tundra' },
      });
      expect.fail('expected ResolutionError');
    } catch (e) {
      expect(e).toBeInstanceOf(ResolutionError);
      const err = e as ResolutionError;
      expect(err.field).toBe('mood.name');
      expect(err.reason).toBe('unknown-mood');
    }
  });

  it('throws ResolutionError with reason missing-field when root_pitch_class is absent', () => {
    const factory = new SignatureFactory(vocabulary, passThroughResolver);
    try {
      factory.direct({
        scale: { name: 'phrygian' } as unknown as DirectComposition['scale'],
        genre: { name: 'hypnotic-techno' },
        mood: { name: 'arrakis' },
      });
      expect.fail('expected ResolutionError');
    } catch (e) {
      expect(e).toBeInstanceOf(ResolutionError);
      const err = e as ResolutionError;
      expect(err.field).toBe('scale.root_pitch_class');
      expect(err.reason).toBe('missing-field');
    }
  });

  it('throws ResolutionError with reason invalid-value when root_pitch_class is out of [0,11]', () => {
    const factory = new SignatureFactory(vocabulary, passThroughResolver);
    try {
      factory.direct({
        scale: { name: 'phrygian', root_pitch_class: 12 },
        genre: { name: 'hypnotic-techno' },
        mood: { name: 'arrakis' },
      });
      expect.fail('expected ResolutionError');
    } catch (e) {
      const err = e as ResolutionError;
      expect(err.field).toBe('scale.root_pitch_class');
      expect(err.reason).toBe('invalid-value');
    }
  });

  it('phrygian + hypnotic-techno + arrakis with no user overrides yields baseline for all performance fields', () => {
    const factory = new SignatureFactory(vocabulary, passThroughResolver);
    const { signature } = factory.direct({
      scale: { name: 'phrygian', root_pitch_class: 2 },
      genre: { name: 'hypnotic-techno' },
      mood: { name: 'arrakis' },
    });
    expect(signature.performance.tempo.source).toBe('baseline');
    expect(signature.performance.energy.source).toBe('baseline');
    expect(signature.performance.complexity.source).toBe('baseline');
    expect(signature.performance.groove.source).toBe('baseline');
    expect(signature.performance.tempo.value).toBe(139);
    expect(signature.performance.energy.value).toBeCloseTo(0.80, 5);
    expect(signature.performance.complexity.value).toBeCloseTo(0.40, 5);
    expect(signature.performance.groove.value).toBeCloseTo(0.80, 5);
  });
});

describe('SignatureFactory.intent', () => {
  it('passes the partial composition to the resolver and merges its fields', async () => {
    const seenPartial: DirectComposition[] = [];
    const resolver: IntentResolver = async (_intent, partial) => {
      seenPartial.push(partial as DirectComposition);
      return {
        ...partial,
        genre: { name: 'deep-house' },
        performance: { ...partial.performance, tempo: 122 },
      };
    };
    const factory = new SignatureFactory(vocabulary, resolver);
    const input: IntentComposition = {
      intent: 'moody late-night groove',
      scale: { name: 'dorian', root_pitch_class: 9 },
      mood: { name: 'cathedral' },
    };
    const { signature, warnings } = await factory.intent(input);
    expect(warnings).toEqual([]);
    expect(seenPartial.length).toBe(1);
    expect(seenPartial[0]!.scale?.name).toBe('dorian');
    expect(seenPartial[0]!.mood?.name).toBe('cathedral');
    expect(seenPartial[0]!.genre?.name).toBeUndefined();

    expect(signature.scale.name).toEqual({ value: 'dorian', source: 'user' });
    expect(signature.scale.root_pitch_class).toEqual({ value: 9, source: 'user' });
    expect(signature.genre.name).toEqual({ value: 'deep-house', source: 'resolver' });
    expect(signature.mood.name).toEqual({ value: 'cathedral', source: 'user' });
    expect(signature.performance.tempo).toEqual({ value: 122, source: 'resolver' });
  });

  it('resolver cannot override an explicitly user-supplied field', async () => {
    const resolver: IntentResolver = async (_intent, partial) => ({
      ...partial,
      mood: { name: 'arrakis' },
    });
    const factory = new SignatureFactory(vocabulary, resolver);
    const { signature } = await factory.intent({
      intent: 'phrygian techno',
      scale: { name: 'phrygian', root_pitch_class: 2 },
      genre: { name: 'hypnotic-techno' },
      mood: { name: 'cathedral' },
    });
    expect(signature.mood.name).toEqual({ value: 'cathedral', source: 'user' });
  });
});

describe('SignatureFactory.create (composite)', () => {
  it('builds a factory with the given vocabulary and resolver', () => {
    const factory = SignatureFactory.create(vocabulary, passThroughResolver);
    expect(factory).toBeInstanceOf(SignatureFactory);
  });
});
