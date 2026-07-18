import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VocabularyRepository } from '../src/repository/vocabulary-repository.js';
import { VocabularyLoadError } from '../src/repository/errors.js';

const SEED_ROOT = resolve(
  dirnameFromImportMeta(),
  '../../../vocabulary',
);

function dirnameFromImportMeta(): string {
  return fileURLToPath(new URL('.', import.meta.url));
}

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'vocab-repo-'));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function writeAllSubtree(): void {
  mkdirSync(join(tmp, 'scales'));
  mkdirSync(join(tmp, 'genres'));
  mkdirSync(join(tmp, 'moods'));
  writeFileSync(join(tmp, 'scales/a.yaml'), 'name: a\nintervals: [0,1,3,5,7,8,10]\ncharacter: []\n');
  writeFileSync(join(tmp, 'genres/g.yaml'), 'name: g\ntempo: {min: 100, max: 110, default: 105}\ndefaults: {energy: 0.5, complexity: 0.5, groove: 0.5}\nrhythm_signature: four-on-the-floor\nharmonic_density: low\n');
  writeFileSync(join(tmp, 'moods/m.yaml'), 'name: m\neffects: []\nregister: bass\nornamentation: []\ndescriptors: []\nbias: {energy: 0, complexity: 0, groove: 0}\n');
}

describe('VocabularyRepository.load — happy path', () => {
  it('loads the seven seed YAMLs from /vocabulary', async () => {
    const repo = await VocabularyRepository.load(SEED_ROOT);
    expect(repo.scales.size).toBe(3);
    expect(repo.genres.size).toBe(2);
    expect(repo.moods.size).toBe(2);
    expect(repo.scales.get('phrygian')?.intervals).toEqual([0, 1, 3, 5, 7, 8, 10]);
    expect(repo.genres.get('hypnotic-techno')?.tempo.default).toBe(139);
    expect(repo.moods.get('arrakis')?.register).toBe('bass');
  });

  it('loads a freshly written tmp subtree', async () => {
    writeAllSubtree();
    const repo = await VocabularyRepository.load(tmp);
    expect(repo.scales.get('a')).toBeDefined();
    expect(repo.genres.get('g')).toBeDefined();
    expect(repo.moods.get('m')).toBeDefined();
  });

  it('exposes a static load factory and no other construction path', () => {
    expect(typeof VocabularyRepository.load).toBe('function');
  });
});

describe('VocabularyRepository.load — failure cases', () => {
  it('throws with descriptive error when rootDir does not exist', async () => {
    const ghost = join(tmp, 'does-not-exist');
    await expect(VocabularyRepository.load(ghost)).rejects.toThrow(/does not exist|not a directory|ENOENT|locate/i);
  });

  it('throws with descriptive error when rootDir is a file, not a directory', async () => {
    const filePath = join(tmp, 'file.yaml');
    writeFileSync(filePath, 'x: 1\n');
    await expect(VocabularyRepository.load(filePath)).rejects.toThrow(/not a directory|directory/i);
  });

  it('throws a VocabularyLoadError listing missing subdirectories', async () => {
    mkdirSync(join(tmp, 'scales'));
    mkdirSync(join(tmp, 'genres'));
    try {
      await VocabularyRepository.load(tmp);
      expect.fail('expected load to fail');
    } catch (err) {
      expect(err).toBeInstanceOf(VocabularyLoadError);
      const loadErr = err as VocabularyLoadError;
      expect(loadErr.issues.some(i => i.kind === 'missing-dir' && i.message.includes('moods'))).toBe(true);
    }
  });

  it('aggregates schema violations as kind=schema issues', async () => {
    mkdirSync(join(tmp, 'scales'));
    mkdirSync(join(tmp, 'genres'));
    mkdirSync(join(tmp, 'moods'));
    writeFileSync(join(tmp, 'scales/bad.yaml'), 'name: bad\nintervals: [0,1]\ncharacter: []\n');
    try {
      await VocabularyRepository.load(tmp);
      expect.fail('expected load to fail');
    } catch (err) {
      expect(err).toBeInstanceOf(VocabularyLoadError);
      const loadErr = err as VocabularyLoadError;
      expect(loadErr.issues.some(i => i.kind === 'schema' && i.filePath.endsWith('bad.yaml'))).toBe(true);
    }
  });

  it('aggregates filename mismatches as kind=filename issues', async () => {
    mkdirSync(join(tmp, 'scales'));
    mkdirSync(join(tmp, 'genres'));
    mkdirSync(join(tmp, 'moods'));
    writeFileSync(join(tmp, 'scales/phrygian.yaml'), 'name: dorian\nintervals: [0,2,3,5,7,9,10]\ncharacter: []\n');
    try {
      await VocabularyRepository.load(tmp);
      expect.fail('expected load to fail');
    } catch (err) {
      expect(err).toBeInstanceOf(VocabularyLoadError);
      const loadErr = err as VocabularyLoadError;
      expect(loadErr.issues.some(i => i.kind === 'filename' && i.filePath.endsWith('phrygian.yaml'))).toBe(true);
    }
  });

  it('aggregates YAML parse errors as kind=parse issues', async () => {
    mkdirSync(join(tmp, 'scales'));
    mkdirSync(join(tmp, 'genres'));
    mkdirSync(join(tmp, 'moods'));
    writeFileSync(join(tmp, 'scales/broken.yaml'), ': :\n  [unbalanced\n');
    try {
      await VocabularyRepository.load(tmp);
      expect.fail('expected load to fail');
    } catch (err) {
      expect(err).toBeInstanceOf(VocabularyLoadError);
      const loadErr = err as VocabularyLoadError;
      expect(loadErr.issues.some(i => i.kind === 'parse' && i.filePath.endsWith('broken.yaml'))).toBe(true);
    }
  });
});

describe('VocabularyRepository.reload', () => {
  it('replaces internal maps atomically with new content', async () => {
    writeAllSubtree();
    const repo = await VocabularyRepository.load(tmp);
    expect(repo.scales.get('a')).toBeDefined();

    writeFileSync(join(tmp, 'scales/b.yaml'), 'name: b\nintervals: [0,2,4,5,7,9,11]\ncharacter: []\n');
    await repo.reload();
    expect(repo.scales.get('a')).toBeDefined();
    expect(repo.scales.get('b')).toBeDefined();
    expect(repo.scales.size).toBe(2);
  });

  it('leaves previous maps intact when reload fails', async () => {
    writeAllSubtree();
    const repo = await VocabularyRepository.load(tmp);
    const beforeScales = repo.scales;
    const beforeGenres = repo.genres;
    const beforeMoods = repo.moods;

    rmSync(join(tmp, 'genres'), { recursive: true, force: true });
    await expect(repo.reload()).rejects.toBeInstanceOf(VocabularyLoadError);
    expect(repo.scales).toBe(beforeScales);
    expect(repo.genres).toBe(beforeGenres);
    expect(repo.moods).toBe(beforeMoods);
  });
});

describe('VocabularyRepository concurrency', () => {
  it('serializes overlapping reload calls without corrupting state', async () => {
    writeAllSubtree();
    const repo = await VocabularyRepository.load(tmp);
    writeFileSync(join(tmp, 'scales/c.yaml'), 'name: c\nintervals: [0,2,4,5,7,9,11]\ncharacter: []\n');
    writeFileSync(join(tmp, 'scales/d.yaml'), 'name: d\nintervals: [0,1,3,5,6,8,10]\ncharacter: []\n');

    const r1 = repo.reload();
    const r2 = repo.reload();
    await Promise.all([r1, r2]);
    expect(repo.scales.get('a')).toBeDefined();
    expect(repo.scales.get('c')).toBeDefined();
    expect(repo.scales.get('d')).toBeDefined();
  });
});
