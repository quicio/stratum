import { readFile, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { frontmatterSchema, type ParsedDoc } from './types.js';

export async function parseFrontmatter(input: string | URL): Promise<ParsedDoc> {
  const filepath = input instanceof URL ? fileURLToPath(input) : input;
  const raw = await readFile(filepath, 'utf-8');

  // Reject gray-matter language engines. Tracking documents are YAML only.
  if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n')) {
    throw new Error(`Expected standard YAML frontmatter in ${filepath}`);
  }
  const parsed = matter(raw);
  const result = frontmatterSchema.safeParse(parsed.data);
  if (!result.success) {
    throw new Error(`Invalid frontmatter in ${filepath}: ${result.error.message}`);
  }
  return {
    filepath,
    frontmatter: result.data,
    body: parsed.content,
  };
}

const TRACKED_DIRS = ['specs', 'adr', 'milestones', 'tasks'] as const;

function filenameMatchesDocument(doc: ParsedDoc): boolean {
  const stem = basename(doc.filepath, '.md');
  const { id, type } = doc.frontmatter;
  if (type === 'spec') return stem.startsWith(`${id.slice('spec-'.length)}-`);
  if (type === 'adr') return stem.startsWith(`${id.slice('adr-'.length)}-`);
  if (type === 'milestone') return stem.startsWith(`${id}-`);
  return stem === id.slice('task-'.length);
}

export async function parseAll(input: string | URL): Promise<ParsedDoc[]> {
  const rootDir = input instanceof URL ? fileURLToPath(input) : input;
  const docs: ParsedDoc[] = [];
  const errors: Error[] = [];

  for (const dir of TRACKED_DIRS) {
    const files = await readdir(join(rootDir, dir), { withFileTypes: true });
    for (const f of files) {
      if (!f.isFile() || !f.name.endsWith('.md') || f.name.startsWith('_')) continue;
      const fullPath = join(rootDir, dir, f.name);
      try {
        docs.push(await parseFrontmatter(fullPath));
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  const byId = new Map<string, ParsedDoc>();
  for (const doc of docs) {
    const { id } = doc.frontmatter;
    if (byId.has(id)) errors.push(new Error(`Duplicate document id '${id}'`));
    else byId.set(id, doc);
    if (!filenameMatchesDocument(doc)) {
      errors.push(new Error(`Filename does not match id '${id}': ${doc.filepath}`));
    }
  }

  for (const doc of docs) {
    const fm = doc.frontmatter;
    if ((fm.type === 'spec' || fm.type === 'task') && byId.get(fm.milestone)?.frontmatter.type !== 'milestone') {
      errors.push(new Error(`Unknown milestone '${fm.milestone}' in ${doc.filepath}`));
    }
    for (const relatedId of fm.related) {
      if (!byId.has(relatedId)) errors.push(new Error(`Unknown related id '${relatedId}' in ${doc.filepath}`));
    }
  }

  if (errors.length > 0) throw new AggregateError(errors, 'Workspace document validation failed');
  return docs;
}
