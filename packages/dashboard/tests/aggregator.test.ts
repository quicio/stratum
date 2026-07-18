import { describe, it, expect } from 'vitest';
import { aggregate } from '../src/aggregator.js';
import type { ParsedDoc, Frontmatter } from '../src/types.js';

const fixtures: ParsedDoc[] = [
  {
    filepath: 'specs/0001-vocab.md',
    frontmatter: {
      id: 'spec-0001', type: 'spec', title: 'Vocab', status: 'draft',
      version: '0.1.0', owner: 'hugo', created: '2026-07-18', updated: '2026-07-18',
      milestone: 'M1', related: [], impl_progress: 0, tags: [],
    } satisfies Frontmatter,
    body: '',
  },
  {
    filepath: 'milestones/M1-vocab.md',
    frontmatter: {
      id: 'M1', type: 'milestone', title: 'Vocab', status: 'planned',
      version: '0.1.0', owner: 'hugo', created: '2026-07-18', updated: '2026-07-18',
      related: [], tags: [],
    } satisfies Frontmatter,
    body: '',
  },
];

describe('aggregate', () => {
  it('groups specs by milestone', () => {
    const result = aggregate(fixtures);
    expect(result.milestones['M1']).toBeDefined();
    expect(result.milestones['M1']!.specs.length).toBe(1);
    expect(result.milestones['M1']!.milestone.frontmatter.title).toBe('Vocab');
  });

  it('separates adrs from specs/tasks/milestones', () => {
    const result = aggregate(fixtures);
    expect(result.adrs.length).toBe(0);
    expect(result.milestones['M1']!.specs.length).toBe(1);
  });

  it('is invariant to input order', () => {
    expect(aggregate([...fixtures].reverse())).toEqual(aggregate(fixtures));
  });
});
