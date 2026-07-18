import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverVocabularyFiles, type DiscoveredFile } from '../src/repository/file-loader.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'vocab-loader-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function writeSubtree(): void {
  mkdirSync(join(root, 'scales'));
  mkdirSync(join(root, 'genres'));
  mkdirSync(join(root, 'moods'));
  writeFileSync(join(root, 'scales/phrygian.yaml'), 'name: phrygian\nintervals: [0,1,3,5,7,8,10]\ncharacter: [dark]\n');
  writeFileSync(join(root, 'scales/dorian.yaml'), 'name: dorian\nintervals: [0,2,3,5,7,9,10]\ncharacter: []\n');
  writeFileSync(join(root, 'genres/hypnotic-techno.yaml'), 'name: hypnotic-techno\ntempo: {min: 136, max: 142, default: 139}\ndefaults: {energy: 0.75, complexity: 0.30, groove: 0.90}\nrhythm_signature: four-on-the-floor\nharmonic_density: low\n');
  writeFileSync(join(root, 'moods/arrakis.yaml'), 'name: arrakis\neffects: [cavern-delay]\nregister: bass\nornamentation: [glide]\ndescriptors: [vast]\nbias: {energy: 0.05, complexity: 0.10, groove: -0.10}\n');
}

describe('discoverVocabularyFiles', () => {
  it('returns one DiscoveredFile per YAML under scales/, genres/, moods/', async () => {
    writeSubtree();
    const { files, missingDirs } = await discoverVocabularyFiles(root);
    expect(missingDirs).toEqual([]);
    const names = files.map(f => f.filePath.split('/').slice(-2).join('/')).sort();
    expect(names).toEqual([
      'genres/hypnotic-techno.yaml',
      'moods/arrakis.yaml',
      'scales/dorian.yaml',
      'scales/phrygian.yaml',
    ]);
    for (const f of files) {
      expect(typeof f.parsed).toBe('object');
      expect(f.parsed).not.toBeNull();
    }
  });

  it('marks the file kind per subdirectory', async () => {
    writeSubtree();
    const { files } = await discoverVocabularyFiles(root);
    const byFile = new Map<string, DiscoveredFile['kind']>(
      files.map(f => [f.filePath, f.kind] as const),
    );
    expect(byFile.get(join(root, 'scales/phrygian.yaml'))).toBe('scale');
    expect(byFile.get(join(root, 'genres/hypnotic-techno.yaml'))).toBe('genre');
    expect(byFile.get(join(root, 'moods/arrakis.yaml'))).toBe('mood');
  });

  it('ignores non-yaml files and hidden files', async () => {
    writeSubtree();
    writeFileSync(join(root, 'scales/README.md'), 'not yaml');
    writeFileSync(join(root, 'scales/.hidden.yaml'), 'name: hidden\nintervals: [0,0,0,0,0,0,0]\ncharacter: []\n');
    const { files } = await discoverVocabularyFiles(root);
    const paths = files.map(f => f.filePath);
    expect(paths).not.toContain(join(root, 'scales/README.md'));
    expect(paths).not.toContain(join(root, 'scales/.hidden.yaml'));
  });

  it('emits a parse-kind VocabularyIssue for invalid YAML', async () => {
    mkdirSync(join(root, 'scales'));
    mkdirSync(join(root, 'genres'));
    mkdirSync(join(root, 'moods'));
    writeFileSync(join(root, 'scales/bad.yaml'), ':\n  - :\n   [unbalanced');
    const { files } = await discoverVocabularyFiles(root);
    const bad = files.find(f => f.filePath.endsWith('bad.yaml'));
    expect(bad).toBeDefined();
    expect(bad!.issues.length).toBeGreaterThan(0);
    expect(bad!.issues[0]!.kind).toBe('parse');
    expect(bad!.parsed).toBeNull();
  });

  it('reports missing subdirectories instead of throwing', async () => {
    mkdirSync(join(root, 'scales'));
    mkdirSync(join(root, 'genres'));
    const { missingDirs } = await discoverVocabularyFiles(root);
    expect(missingDirs).toContain(join(root, 'moods'));
  });
});
