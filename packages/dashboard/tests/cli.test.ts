import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/cli.js');
const FIXTURE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/workspace');
const NESTED = join(FIXTURE_ROOT, 'deeply/nested/cwd');

function setupWorkspace(): void {
  for (const d of ['specs', 'adr', 'milestones', 'tasks']) {
    mkdirSync(join(FIXTURE_ROOT, d), { recursive: true });
  }
  writeFileSync(
    join(FIXTURE_ROOT, 'pnpm-workspace.yaml'),
    "packages:\n  - 'apps/*'\n  - 'packages/*'\n",
  );
  writeFileSync(join(FIXTURE_ROOT, 'specs/0001-fixture.md'), `---
id: spec-0001
type: spec
title: "Fixture"
status: draft
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M1
related: []
tags: []
---

# Fixture spec body
`);
  writeFileSync(join(FIXTURE_ROOT, 'milestones/M1-fixture.md'), `---
id: M1
type: milestone
title: "Fixture milestone"
status: planned
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
related: []
tags: []
---

# Fixture milestone body
`);
  mkdirSync(NESTED, { recursive: true });
}

describe('cli (integration)', () => {
  it('renders dashboard when invoked from the workspace root', () => {
    setupWorkspace();
    const result = spawnSync('node', [CLI_PATH], { cwd: FIXTURE_ROOT, encoding: 'utf-8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('STRATUM');
    expect(result.stdout).toContain('spec-0001');
  });

  it('finds the workspace root when invoked from a nested cwd', () => {
    const result = spawnSync('node', [CLI_PATH], { cwd: NESTED, encoding: 'utf-8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('STRATUM');
  });

  it('exits non-zero with a diagnostic when invoked outside any workspace', () => {
    const result = spawnSync('node', [CLI_PATH], { cwd: '/tmp', encoding: 'utf-8' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Could not locate the Stratum workspace root');
  });

  it('reports every invalid document via AggregateError and exits non-zero', () => {
    writeFileSync(join(FIXTURE_ROOT, 'specs/0001-broken.md'), `---
id: spec-9999
type: spec
title: "Broken"
status: not_a_real_status
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M1
related: []
tags: []
---

# Broken body
`);
    const result = spawnSync('node', [CLI_PATH], { cwd: FIXTURE_ROOT, encoding: 'utf-8' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('0001-broken.md');
    rmSync(join(FIXTURE_ROOT, 'specs/0001-broken.md'));
  });
});
