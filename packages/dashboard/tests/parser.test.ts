import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from '../src/parser.js';

const validSpecPath = new URL('./fixtures/specs/0001-sample.md', import.meta.url);
const missingIdPath = new URL('./invalid-fixtures/spec-missing-id.md', import.meta.url);

describe('parseFrontmatter', () => {
  it('returns typed record with all required fields for a spec', async () => {
    const result = await parseFrontmatter(validSpecPath);

    expect(result.frontmatter.id).toBe('spec-0001');
    expect(result.frontmatter.type).toBe('spec');
    expect(result.frontmatter.title).toBe('Sample spec');
    expect(result.frontmatter.status).toBe('draft');
    expect(result.frontmatter.milestone).toBe('M1');
    expect(result.body).toContain('# Sample spec');
  });

  it('throws on missing required field id', async () => {
    await expect(parseFrontmatter(missingIdPath)).rejects.toThrow(/id/);
  });
});
