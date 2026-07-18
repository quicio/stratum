import { z } from 'zod';

const dateString = z.preprocess(
  value => value instanceof Date ? value.toISOString().slice(0, 10) : value,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
);
const progress = z.number().int().min(0).max(100).optional();
const common = {
  title: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  owner: z.string().min(1),
  created: dateString,
  updated: dateString,
  related: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
};

export const frontmatterSchema = z.discriminatedUnion('type', [
  z.object({
    ...common,
    id: z.string().regex(/^spec-\d{4}$/),
    type: z.literal('spec'),
    kind: z.enum(['domain', 'implementation']).optional(),
    status: z.enum(['draft', 'approved', 'in_progress', 'stable', 'deprecated']),
    milestone: z.string().regex(/^M\d+$/),
    impl_progress: progress,
  }).strict(),
  z.object({
    ...common,
    id: z.string().regex(/^adr-\d{4}$/),
    type: z.literal('adr'),
    status: z.enum(['proposed', 'accepted', 'superseded', 'rejected']),
  }).strict(),
  z.object({
    ...common,
    id: z.string().regex(/^M\d+$/),
    type: z.literal('milestone'),
    status: z.enum(['planned', 'active', 'shipped', 'cancelled']),
  }).strict(),
  z.object({
    ...common,
    id: z.string().regex(/^task-\d{4}-\d{2}-\d{2}-.+$/),
    type: z.literal('task'),
    status: z.enum(['todo', 'doing', 'done', 'blocked', 'cancelled']),
    milestone: z.string().regex(/^M\d+$/),
    impl_progress: progress,
  }).strict(),
]);

export type Frontmatter = z.infer<typeof frontmatterSchema> & {
  milestone?: string | undefined;
  impl_progress?: number | undefined;
};
export type DocType = Frontmatter['type'];

export interface ParsedDoc {
  filepath: string;
  frontmatter: Frontmatter;
  body: string;
}
