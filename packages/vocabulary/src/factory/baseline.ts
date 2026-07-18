import type { Genre, Mood } from '../domain/types.js';

export interface Baseline {
  readonly tempo?: number;
  readonly energy: number;
  readonly complexity: number;
  readonly groove: number;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function computeBaseline(genre: Genre, mood: Mood): Baseline {
  return {
    ...(genre.tempo.default !== undefined ? { tempo: genre.tempo.default } : {}),
    energy: clamp(genre.defaults.energy + mood.bias.energy, 0, 1),
    complexity: clamp(genre.defaults.complexity + mood.bias.complexity, 0, 1),
    groove: clamp(genre.defaults.groove + mood.bias.groove, 0, 1),
  };
}
