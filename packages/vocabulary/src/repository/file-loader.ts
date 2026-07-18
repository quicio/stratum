import { readFile, readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { VocabularyIssue } from './errors.js';

export type VocabularyKind = 'scale' | 'genre' | 'mood';

export interface DiscoveredFile {
  filePath: string;
  kind: VocabularyKind;
  parsed: unknown;
  issues: VocabularyIssue[];
}

const SUBDIRS: ReadonlyArray<{ dir: string; kind: VocabularyKind }> = [
  { dir: 'scales', kind: 'scale' },
  { dir: 'genres', kind: 'genre' },
  { dir: 'moods', kind: 'mood' },
];

async function listYamls(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && e.name.endsWith('.yaml') && !e.name.startsWith('.'))
    .map(e => e.name)
    .sort();
}

export async function discoverVocabularyFiles(
  rootDir: string,
): Promise<{ files: DiscoveredFile[]; missingDirs: string[] }> {
  const root = resolve(rootDir);
  const files: DiscoveredFile[] = [];
  const missingDirs: string[] = [];

  for (const { dir, kind } of SUBDIRS) {
    const subdir = join(root, dir);
    let fileNames: string[];
    try {
      fileNames = await listYamls(subdir);
    } catch {
      missingDirs.push(subdir);
      continue;
    }

    for (const fileName of fileNames) {
      const filePath = join(subdir, fileName);
      const fileIssues: VocabularyIssue[] = [];
      let parsed: unknown = null;
      try {
        const raw = await readFile(filePath, 'utf-8');
        parsed = parseYaml(raw);
      } catch (err) {
        fileIssues.push({
          filePath,
          kind: 'parse',
          message: `YAML parse error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
      files.push({
        filePath,
        kind,
        parsed,
        issues: fileIssues,
      });
    }
  }

  return { files, missingDirs };
}

export function filenameStem(filePath: string): string {
  return basename(filePath, '.yaml');
}
