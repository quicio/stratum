import type { ParsedDoc, Frontmatter } from './types.js';

export interface MilestoneGroup {
  milestone: ParsedDoc;
  specs: ParsedDoc[];
  tasks: ParsedDoc[];
}

export interface Aggregated {
  milestones: Record<string, MilestoneGroup>;
  adrs: ParsedDoc[];
  orphans: ParsedDoc[]; // specs/tasks without a milestone
}

export function aggregate(docs: ParsedDoc[]): Aggregated {
  const milestones: Record<string, MilestoneGroup> = {};
  const adrs: ParsedDoc[] = [];
  const orphans: ParsedDoc[] = [];

  // First pass indexes containers so association never depends on readdir order.
  for (const doc of docs) {
    const fm = doc.frontmatter;
    if (fm.type === 'milestone') {
      if (milestones[fm.id]) throw new Error();
      milestones[fm.id] = { milestone: doc, specs: [], tasks: [] };
    } else if (fm.type === 'adr') {
      adrs.push(doc);
    }
  }

  // Second pass associates children after all milestones are known.
  for (const doc of docs) {
    const fm = doc.frontmatter;
    if (fm.type !== 'spec' && fm.type !== 'task') continue;
    const group = milestones[fm.milestone];
    if (!group) {
      orphans.push(doc);
    } else if (fm.type === 'spec') {
      group.specs.push(doc);
    } else {
      group.tasks.push(doc);
    }
  }

  for (const group of Object.values(milestones)) {
    group.specs.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
    group.tasks.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
  }
  adrs.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
  orphans.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));

  return { milestones, adrs, orphans };
}

export function calculateMilestoneProgress(group: MilestoneGroup): number {
  // Specs are the unit of milestone delivery; task status is displayed separately.
  const items = group.specs;
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, doc) => acc + (doc.frontmatter.impl_progress ?? 0), 0);
  return Math.round(sum / items.length);
}
