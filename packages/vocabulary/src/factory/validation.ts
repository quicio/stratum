import type { Genre, Mood, Scale } from '../domain/types.js';

export type ResolutionReason =
  | 'unknown-scale'
  | 'unknown-genre'
  | 'unknown-mood'
  | 'missing-field'
  | 'invalid-value';

export class ResolutionError extends Error {
  public readonly field: string;
  public readonly reason: ResolutionReason;

  constructor(field: string, reason: ResolutionReason, message: string) {
    super(message);
    this.name = 'ResolutionError';
    this.field = field;
    this.reason = reason;
  }
}

export function validateVocabularyPresence(
  scale: Scale | undefined,
  genre: Genre | undefined,
  mood: Mood | undefined,
): void {
  if (!scale) {
    throw new ResolutionError(
      'scale.name',
      'unknown-scale',
      `Unknown scale name. Valid scales: see vocabulary/scales/.`,
    );
  }
  if (!genre) {
    throw new ResolutionError(
      'genre.name',
      'unknown-genre',
      `Unknown genre name. Valid genres: see vocabulary/genres/.`,
    );
  }
  if (!mood) {
    throw new ResolutionError(
      'mood.name',
      'unknown-mood',
      `Unknown mood name. Valid moods: see vocabulary/moods/.`,
    );
  }
}

export interface TempoClampResult {
  value: number;
  warning: ResolutionWarning | undefined;
}

export interface ResolutionWarning {
  field: string;
  message: string;
}

export function clampTempo(userTempo: number, genre: Genre): TempoClampResult {
  if (userTempo < genre.tempo.min) {
    return {
      value: genre.tempo.min,
      warning: {
        field: 'performance.tempo',
        message: `clamped from ${userTempo} to ${genre.tempo.min}`,
      },
    };
  }
  if (userTempo > genre.tempo.max) {
    return {
      value: genre.tempo.max,
      warning: {
        field: 'performance.tempo',
        message: `clamped from ${userTempo} to ${genre.tempo.max}`,
      },
    };
  }
  return { value: userTempo, warning: undefined };
}
