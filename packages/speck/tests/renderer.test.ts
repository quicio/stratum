import { describe, it, expect } from 'vitest';
import { renderDashboard } from '../src/renderer.js';
import { aggregate } from '../src/aggregator.js';
import type { ParsedDoc, Frontmatter } from '../src/types.js';

const docs: ParsedDoc[] = [
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

describe('renderDashboard', () => {
  it('contains the milestone id and title', () => {
    const agg = aggregate(docs);
    const out = renderDashboard(agg);
    expect(out).toContain('M1');
    expect(out).toContain('Vocab');
    expect(out).toContain('spec-0001');
  });
});
