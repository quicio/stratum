import { readFile } from 'node:fs/promises';
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
