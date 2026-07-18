import { describe, it, expect } from 'vitest';
import { VocabularyLoadError, type VocabularyIssue } from '../src/repository/errors.js';

describe('VocabularyIssue', () => {
  it('exposes filePath, kind, and message fields', () => {
    const issue: VocabularyIssue = {
      filePath: '/abs/scales/broken.yaml',
      kind: 'schema',
      message: 'bad field',
    };
    expect(issue.filePath).toBe('/abs/scales/broken.yaml');
    expect(issue.kind).toBe('schema');
    expect(issue.message).toBe('bad field');
  });
});

describe('VocabularyLoadError', () => {
  it('aggregates one or more issues', () => {
    const issues: VocabularyIssue[] = [
      { filePath: '/abs/scales/a.yaml', kind: 'parse', message: 'syntax error' },
      { filePath: '/abs/genres/b.yaml', kind: 'schema', message: 'field X missing' },
    ];
    const err = new VocabularyLoadError('/abs', issues);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('VocabularyLoadError');
    expect(err.rootDir).toBe('/abs');
    expect(err.issues).toEqual(issues);
    expect(err.issues.length).toBe(2);
    expect(err.message).toContain('2 issue');
    expect(err.message).toContain('/abs');
  });

  it('formats singular issue count correctly', () => {
    const err = new VocabularyLoadError('/abs', [
      { filePath: '/abs/scales/a.yaml', kind: 'parse', message: 'syntax error' },
    ]);
    expect(err.message).toContain('1 issue ');
    expect(err.message).not.toContain('1 issues');
  });

  it('throws (not just constructs) when no issues are provided', () => {
    expect(() => new VocabularyLoadError('/abs', [])).toThrow();
  });
});
