import { z } from 'zod';

export const KEBAB_CASE = /^[a-z][a-z0-9-]*$/;

export const ScaleSchema = z.object({
  name: z.string().regex(KEBAB_CASE),
  intervals: z.array(z.number().int().min(0).max(127)).length(7),
  character: z.array(z.string()).default([]),
});
export type Scale = z.infer<typeof ScaleSchema>;

export const GenreSchema = z
  .object({
    name: z.string().regex(KEBAB_CASE),
    tempo: z
      .object({
        min: z.number().int().positive(),
        max: z.number().int().positive(),
        default: z.number().int().positive().optional(),
      })
      .refine(t => t.min <= t.max, { message: 'tempo.min must be <= tempo.max' })
      .refine(
        t => t.default === undefined || (t.default >= t.min && t.default <= t.max),
        { message: 'tempo.default must be within [min, max] when present' },
      ),
    defaults: z.object({
      energy: z.number().min(0).max(1),
      complexity: z.number().min(0).max(1),
      groove: z.number().min(0).max(1),
    }),
    rhythm_signature: z.string().min(1),
    harmonic_density: z.enum(['low', 'medium', 'high']),
  });
export type Genre = z.infer<typeof GenreSchema>;

export const MoodSchema = z.object({
  name: z.string().regex(KEBAB_CASE),
  effects: z.array(z.string()),
  register: z.enum(['bass', 'mid', 'high', 'full']),
  ornamentation: z.array(z.string()),
  descriptors: z.array(z.string()),
  bias: z.object({
    energy: z.number().min(-1).max(1),
    complexity: z.number().min(-1).max(1),
    groove: z.number().min(-1).max(1),
  }),
});
export type Mood = z.infer<typeof MoodSchema>;

export type PerformanceAxis = 'tempo' | 'energy' | 'complexity' | 'groove';
