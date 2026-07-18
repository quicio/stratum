import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { GenreSchema, MoodSchema, ScaleSchema, type Genre, type Mood, type Scale } from '../domain/types.js';
import { VocabularyLoadError, type VocabularyIssue } from './errors.js';
import { discoverVocabularyFiles, filenameStem, type VocabularyKind } from './file-loader.js';

export class VocabularyRepository {
  readonly rootDir: string;
  #scales: ReadonlyMap<string, Scale>;
  #genres: ReadonlyMap<string, Genre>;
  #moods: ReadonlyMap<string, Mood>;
  #mutex: Promise<void> = Promise.resolve();

  private constructor(
    rootDir: string,
    scales: ReadonlyMap<string, Scale>,
    genres: ReadonlyMap<string, Genre>,
    moods: ReadonlyMap<string, Mood>,
  ) {
    this.rootDir = rootDir;
    this.#scales = scales;
    this.#genres = genres;
    this.#moods = moods;
  }

  static load(rootDir: string): Promise<VocabularyRepository> {
    return VocabularyRepository.construct(rootDir);
  }

  async reload(): Promise<void> {
    const next = this.#mutex.then(async () => {
      const nextRepo = await VocabularyRepository.construct(this.rootDir);
      this.replaceWith(nextRepo);
    });
    this.#mutex = next.catch(() => undefined);
    await next;
  }

  get scales(): ReadonlyMap<string, Scale> {
    return this.#scales;
  }

  get genres(): ReadonlyMap<string, Genre> {
    return this.#genres;
  }

  get moods(): ReadonlyMap<string, Mood> {
    return this.#moods;
  }

  private replaceWith(other: VocabularyRepository): void {
    this.#scales = other.#scales;
    this.#genres = other.#genres;
    this.#moods = other.#moods;
  }

  private static async construct(rootDir: string): Promise<VocabularyRepository> {
    const absRoot = resolve(rootDir);
    const dirStat = await stat(absRoot).catch(() => null);
    if (!dirStat) {
      throw new Error(`Vocabulary root does not exist: ${absRoot}`);
    }
    if (!dirStat.isDirectory()) {
      throw new Error(`Vocabulary root is not a directory: ${absRoot}`);
    }

    const { files, missingDirs } = await discoverVocabularyFiles(absRoot);
    const issues: VocabularyIssue[] = [];

    for (const subdir of missingDirs) {
      issues.push({
        filePath: subdir,
        kind: 'missing-dir',
        message: `Required vocabulary subdirectory is missing: ${subdir}`,
      });
    }

    const scales = new Map<string, Scale>();
    const genres = new Map<string, Genre>();
    const moods = new Map<string, Mood>();

    for (const f of files) {
      if (f.issues.length > 0) {
        issues.push(...f.issues);
        continue;
      }
      const stem = filenameStem(f.filePath);
      const validated = validateAgainstSchema(f.filePath, stem, f.kind, f.parsed, issues);
      if (!validated) continue;
      if (validated.name !== stem) {
        issues.push({
          filePath: f.filePath,
          kind: 'filename',
          message: `Filename '${stem}.yaml' does not match 'name: ${validated.name}'`,
        });
        continue;
      }
      switch (f.kind) {
        case 'scale':
          scales.set(validated.name, validated as Scale);
          break;
        case 'genre':
          genres.set(validated.name, validated as Genre);
          break;
        case 'mood':
          moods.set(validated.name, validated as Mood);
          break;
      }
    }

    if (issues.length > 0) {
      throw new VocabularyLoadError(absRoot, issues);
    }

    return new VocabularyRepository(absRoot, scales, genres, moods);
  }
}

function validateAgainstSchema(
  filePath: string,
  stem: string,
  kind: VocabularyKind,
  parsed: unknown,
  issues: VocabularyIssue[],
): z.infer<typeof ScaleSchema> | z.infer<typeof GenreSchema> | z.infer<typeof MoodSchema> | null {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    issues.push({
      filePath,
      kind: 'schema',
      message: `Expected a YAML mapping for ${kind} '${stem}', got ${describe(parsed)}`,
    });
    return null;
  }
  const schema = kind === 'scale' ? ScaleSchema : kind === 'genre' ? GenreSchema : MoodSchema;
  const result = schema.safeParse(parsed);
  if (!result.success) {
    issues.push({
      filePath,
      kind: 'schema',
      message: result.error.issues
        .map(i => `${i.path.join('.') || '<root>'}: ${i.message}`)
        .join('; '),
    });
    return null;
  }
  return result.data;
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
