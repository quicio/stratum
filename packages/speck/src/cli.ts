#!/usr/bin/env node
import { access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseAll } from './parser.js';
import { aggregate } from './aggregator.js';
import { renderDashboard } from './renderer.js';

const REQUIRED_PATHS = ['pnpm-workspace.yaml', 'specs', 'adr', 'milestones', 'tasks'] as const;

async function isWorkspaceRoot(directory: string): Promise<boolean> {
  try {
    await Promise.all(REQUIRED_PATHS.map(path => access(join(directory, path))));
    return true;
  } catch {
    return false;
  }
}

async function findWorkspaceRoot(start: string): Promise<string> {
  let cursor = resolve(start);
  while (true) {
    if (await isWorkspaceRoot(cursor)) return cursor;
    const parent = dirname(cursor);
    if (parent === cursor) throw new Error('Could not locate the Stratum workspace root');
    cursor = parent;
  }
}

async function main(): Promise<void> {
  const root = await findWorkspaceRoot(process.cwd());
  const docs = await parseAll(root);
  process.stdout.write(`${renderDashboard(aggregate(docs))}\n`);
}

main().catch(err => {
  if (err instanceof AggregateError) {
    for (const cause of err.errors) process.stderr.write(`${String(cause)}\n`);
  } else {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  }
  process.exitCode = 1;
});