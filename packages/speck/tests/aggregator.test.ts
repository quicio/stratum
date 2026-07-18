import { describe, it, expect } from 'vitest';
import { aggregate, calculateMilestoneProgress } from '../src/aggregator.js';
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

  it('excludes Domain Specs from milestone progress', () => {
    // A milestone with one Domain Spec (impl_progress 0) and one
    // Implementation Spec (impl_progress 100) should report 100%,
    // not 50% — Domain Specs are not implementable; their
    // semantics are realized by the Implementation Specs that
    // specialize them.
    const milestone: ParsedDoc = {
      filepath: 'milestones/M1.md',
      frontmatter: {
        id: 'M1', type: 'milestone', title: 'M1', status: 'active',
        version: '0.1.0', owner: 'hugo', created: '2026-07-18', updated: '2026-07-18',
        related: [], tags: [],
      } satisfies Frontmatter,
      body: '',
    };
    const domain: ParsedDoc = {
      filepath: 'specs/0001-domain.md',
      frontmatter: {
        id: 'spec-0001', type: 'spec', kind: 'domain', title: 'Domain', status: 'approved',
        version: '0.1.0', owner: 'hugo', created: '2026-07-18', updated: '2026-07-18',
        milestone: 'M1', related: [], impl_progress: 0, tags: [],
      } satisfies Frontmatter,
      body: '',
    };
    const impl: ParsedDoc = {
      filepath: 'specs/0003-impl.md',
      frontmatter: {
        id: 'spec-0003', type: 'spec', kind: 'implementation', title: 'Impl', status: 'approved',
        version: '0.1.0', owner: 'hugo', created: '2026-07-18', updated: '2026-07-18',
        milestone: 'M1', related: [], impl_progress: 100, tags: [],
      } satisfies Frontmatter,
      body: '',
    };
    const group = aggregate([milestone, domain, impl]).milestones['M1'];
    expect(group).toBeDefined();
    if (group) expect(calculateMilestoneProgress(group)).toBe(100);
  });

  it('counts Implementation Specs without explicit kind for backward compat', () => {
    // Specs written before the Domain/Implementation split may not have
    // 'kind' set. They default to 'implementation' and count toward
    // progress (this is the safe default — the spec is more likely to
    // be a TS Implementation Spec than a language-agnostic Domain Spec).
    const legacy: ParsedDoc = {
      filepath: 'specs/0099-legacy.md',
      frontmatter: {
        id: 'spec-0099', type: 'spec', title: 'Legacy', status: 'approved',
        version: '0.1.0', owner: 'hugo', created: '2026-07-18', updated: '2026-07-18',
        milestone: 'M1', related: [], impl_progress: 100, tags: [],
      } satisfies Frontmatter,
      body: '',
    };
    const mixed = [...fixtures, legacy];
    const group = aggregate(mixed).milestones['M1'];
    expect(group).toBeDefined();
    if (group) expect(calculateMilestoneProgress(group)).toBe(50);
  });
});
