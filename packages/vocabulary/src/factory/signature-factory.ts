import type { Provenance } from '../domain/provenance.js';
import type { MusicalSignature } from '../domain/musical-signature.js';
import type { Genre, Mood, Scale, PerformanceAxis } from '../domain/types.js';
import { computeBaseline } from './baseline.js';
import { ResolutionError, clampTempo, validateVocabularyPresence, type ResolutionWarning } from './validation.js';
import type { VocabularyRepository } from '../repository/vocabulary-repository.js';

export { ResolutionError } from './validation.js';
export type { ResolutionWarning } from './validation.js';

export interface DirectComposition {
  readonly scale: { name: string; root_pitch_class: number };
  readonly genre: { name: string };
  readonly mood: { name: string };
  readonly performance?: Partial<Record<PerformanceAxis, number>>;
}

export interface IntentComposition {
  readonly intent: string;
  readonly scale?: { name: string; root_pitch_class: number };
  readonly genre?: { name: string };
  readonly mood?: { name: string };
  readonly performance?: Partial<Record<PerformanceAxis, number>>;
}


export interface ResolutionResult {
  readonly signature: MusicalSignature;
  readonly warnings: readonly ResolutionWarning[];
}

export type IntentResolver = (
  intent: string,
  partial: Partial<DirectComposition>,
  vocabulary: VocabularyRepository,
) => Promise<Partial<DirectComposition>>;

const IDENTITY_RESOLVER: IntentResolver = async (_intent, partial) => partial;

export class SignatureFactory {
  static create(
    vocabulary: VocabularyRepository,
    intentResolver?: IntentResolver,
  ): SignatureFactory {
    return new SignatureFactory(vocabulary, intentResolver ?? IDENTITY_RESOLVER);
  }

  constructor(
    private readonly vocabulary: VocabularyRepository,
    private readonly intentResolver: IntentResolver,
  ) {}

  direct(input: DirectComposition): ResolutionResult {
    return this.buildSignature({
      scale: { value: input.scale, source: 'user' },
      genre: { value: input.genre, source: 'user' },
      mood: { value: input.mood, source: 'user' },
      performance: input.performance ?? {},
    });
  }

  async intent(input: IntentComposition): Promise<ResolutionResult> {
    type Writable<T> = { -readonly [K in keyof T]: T[K] };
    const userPartial: Partial<Writable<DirectComposition>> = {};
    if (input.scale) userPartial.scale = input.scale;
    if (input.genre) userPartial.genre = input.genre;
    if (input.mood) userPartial.mood = input.mood;
    if (input.performance) userPartial.performance = input.performance;

    const overlay = await this.intentResolver(input.intent, userPartial, this.vocabulary);

    const mergedScale = userPartial.scale ?? overlay.scale;
    const mergedGenre = userPartial.genre ?? overlay.genre;
    const mergedMood = userPartial.mood ?? overlay.mood;

    const mergedUserPerf: Partial<Record<PerformanceAxis, number>> = {
      ...(userPartial.performance ?? {}),
    };
    const mergedResolverPerf: Partial<Record<PerformanceAxis, number>> = {};
    if (overlay.performance) {
      for (const [k, v] of Object.entries(overlay.performance)) {
        if (v === undefined) continue;
        const axis = k as PerformanceAxis;
        if (mergedUserPerf[axis] === undefined) {
          mergedResolverPerf[axis] = v;
        }
      }
    }

    if (!mergedScale || !mergedGenre || !mergedMood) {
      const missing: string[] = [];
      if (!mergedScale) missing.push('scale');
      if (!mergedGenre) missing.push('genre');
      if (!mergedMood) missing.push('mood');
      throw new ResolutionError(
        missing[0]!,
        'missing-field',
        `Intent resolver failed to fill required fields: ${missing.join(', ')}`,
      );
    }

    return this.buildSignature({
      scale: provenanceOrResolver(mergedScale, userPartial.scale),
      genre: provenanceOrResolver(mergedGenre, userPartial.genre),
      mood: provenanceOrResolver(mergedMood, userPartial.mood),
      userPerformance: mergedUserPerf,
      resolverPerformance: mergedResolverPerf,
    });
  }

  private buildSignature(args: {
    scale: Provenance<{ name: string; root_pitch_class: number }>;
    genre: Provenance<{ name: string }>;
    mood: Provenance<{ name: string }>;
    performance?: Partial<Record<PerformanceAxis, number>>;
    userPerformance?: Partial<Record<PerformanceAxis, number>>;
    resolverPerformance?: Partial<Record<PerformanceAxis, number>>;
  }): ResolutionResult {
    const scaleValue = args.scale.value;
    const genreValue = args.genre.value;
    const moodValue = args.mood.value;

    if (!Number.isInteger(scaleValue.root_pitch_class)) {
      throw new ResolutionError(
        'scale.root_pitch_class',
        'missing-field',
        'scale.root_pitch_class is required; the scale mode does not imply a tonic.',
      );
    }
    if (scaleValue.root_pitch_class < 0 || scaleValue.root_pitch_class > 11) {
      throw new ResolutionError(
        'scale.root_pitch_class',
        'invalid-value',
        `scale.root_pitch_class must be an integer in [0, 11]; got ${scaleValue.root_pitch_class}`,
      );
    }

    const scale = this.vocabulary.scales.get(scaleValue.name);
    const genre = this.vocabulary.genres.get(genreValue.name);
    const mood = this.vocabulary.moods.get(moodValue.name);
    validateVocabularyPresence(scale, genre, mood);

    const warnings: ResolutionWarning[] = [];

    const baseline = computeBaseline(genre!, mood!);

    const userPerf = args.performance ?? args.userPerformance ?? {};
    const resolverPerf = args.resolverPerformance ?? {};

    const tempo = resolveAxisWithClamp(
      'tempo',
      userPerf.tempo,
      resolverPerf.tempo,
      baseline.tempo,
      genre!,
      warnings,
    );
    const energy = resolveAxisInUnit(
      'energy',
      userPerf.energy,
      resolverPerf.energy,
      baseline.energy,
    );
    const complexity = resolveAxisInUnit(
      'complexity',
      userPerf.complexity,
      resolverPerf.complexity,
      baseline.complexity,
    );
    const groove = resolveAxisInUnit(
      'groove',
      userPerf.groove,
      resolverPerf.groove,
      baseline.groove,
    );

    const signature: MusicalSignature = {
      scale: {
        name: { value: scaleValue.name, source: args.scale.source },
        root_pitch_class: { value: scaleValue.root_pitch_class, source: args.scale.source },
      },
      genre: { name: { value: genreValue.name, source: args.genre.source } },
      mood: { name: { value: moodValue.name, source: args.mood.source } },
      performance: { tempo, energy, complexity, groove },
    };

    return { signature, warnings };
  }
}

function provenanceOrResolver<T>(value: T, userValue: T | undefined): Provenance<T> {
  if (userValue !== undefined) {
    return { value, source: 'user' };
  }
  return { value, source: 'resolver' };
}

function resolveAxisWithClamp(
  field: PerformanceAxis,
  userValue: number | undefined,
  resolverValue: number | undefined,
  baselineValue: number | undefined,
  genre: Genre,
  warnings: ResolutionWarning[],
): Provenance<number> {
  if (userValue !== undefined) {
    if (field === 'tempo') {
      const { value, warning } = clampTempo(userValue, genre);
      if (warning) warnings.push(warning);
      return { value, source: 'user' };
    }
    validateUnit(field, userValue);
    return { value: userValue, source: 'user' };
  }
  if (resolverValue !== undefined) {
    if (field === 'tempo') {
      return { value: resolverValue, source: 'resolver' };
    }
    validateUnit(field, resolverValue);
    return { value: resolverValue, source: 'resolver' };
  }
  if (baselineValue !== undefined) {
    return { value: baselineValue, source: 'baseline' };
  }
  throw new ResolutionError(
    `performance.${field}`,
    'missing-field',
    `performance.${field} has no source: neither user nor baseline supplied`,
  );
}

function resolveAxisInUnit(
  field: PerformanceAxis,
  userValue: number | undefined,
  resolverValue: number | undefined,
  baselineValue: number,
): Provenance<number> {
  if (userValue !== undefined) {
    validateUnit(field, userValue);
    return { value: userValue, source: 'user' };
  }
  if (resolverValue !== undefined) {
    validateUnit(field, resolverValue);
    return { value: resolverValue, source: 'resolver' };
  }
  return { value: baselineValue, source: 'baseline' };
}

function validateUnit(field: PerformanceAxis, value: number): void {
  if (value < 0 || value > 1) {
    throw new ResolutionError(
      `performance.${field}`,
      'invalid-value',
      `performance.${field} must be in [0, 1]; got ${value}`,
    );
  }
}
