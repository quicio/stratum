import chalk from 'chalk';
import type { Aggregated, MilestoneGroup } from './aggregator.js';
import { calculateMilestoneProgress } from './aggregator.js';

const BAR_WIDTH = 10;

function progressBar(pct: number): string {
  const safePct = Math.min(100, Math.max(0, pct));
  const filled = Math.round((safePct / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return chalk.green('▓'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

function statusIcon(status: string): string {
  switch (status) {
    case 'draft': case 'planned': case 'todo': case 'proposed':
      return chalk.gray('○');
    case 'approved': case 'doing': case 'in_progress': case 'active':
      return chalk.yellow('◐');
    case 'stable': case 'shipped': case 'done': case 'accepted':
      return chalk.green('✓');
    case 'deprecated': case 'superseded': case 'cancelled': case 'rejected':
      return chalk.red('✗');
    case 'blocked':
      return chalk.red('✗');
    default:
      return ' ';
  }
}

export function renderDashboard(agg: Aggregated): string {
  const lines: string[] = [];
  const date = new Date().toISOString().slice(0, 10);

  lines.push('');
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════════════'));
  lines.push(chalk.bold.cyan(`  STRATUM  ·  Dashboard  ·  ${date}`));
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════════════'));
  lines.push('');

  const milestones = Object.values(agg.milestones).sort((a, b) =>
    a.milestone.frontmatter.id.localeCompare(b.milestone.frontmatter.id),
  );

  for (const group of milestones) {
    const fm = group.milestone.frontmatter;
    const pct = calculateMilestoneProgress(group);
    lines.push(
      `${chalk.bold(fm.id)} — ${fm.title.padEnd(28)} [${progressBar(pct)}]  ${String(pct).padStart(3)}%   ${chalk.cyan(fm.status)}`,
    );
    for (const spec of group.specs.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id))) {
      lines.push(
        `    ${statusIcon(spec.frontmatter.status)} ${spec.frontmatter.id}  ${spec.frontmatter.title.padEnd(40)}   ${chalk.cyan(spec.frontmatter.status)}`,
      );
    }
    for (const task of group.tasks.sort((a, b) => a.frontmatter.created.localeCompare(b.frontmatter.created))) {
      lines.push(
        `    ${statusIcon(task.frontmatter.status)} ${chalk.gray(task.frontmatter.id)}  ${chalk.gray(task.frontmatter.title)}`,
      );
    }
    lines.push('');
  }

  if (agg.adrs.length > 0) {
    lines.push(chalk.bold('  ADR (decisiones arquitectónicas)'));
    for (const adr of agg.adrs.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id))) {
      lines.push(
        `    ${statusIcon(adr.frontmatter.status)} ${adr.frontmatter.id}  ${adr.frontmatter.title.padEnd(40)}   ${chalk.cyan(adr.frontmatter.status)}`,
      );
    }
    lines.push('');
  }

  if (agg.orphans.length > 0) {
    lines.push(chalk.yellow(`  ⚠ ${agg.orphans.length} orphan(s) (specs/tasks without milestone):`));
    for (const o of agg.orphans) {
      lines.push(`    ${o.frontmatter.id}  ${o.frontmatter.title}`);
    }
  }

  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════════════'));
  return lines.join('\n');
}
